'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/auth/session-context'
import { unwrap } from '@/lib/errors'
import { queryKeys } from './keys'

/**
 * Categories are the fixed four and global; subcategories are per-site and
 * Owner-managed. Both are reference data — cached hard, they barely change.
 */

export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface Subcategory {
  id: string
  name: string
  category_id: string
  archived_at: string | null
  inactive_at: string | null
}

type LegacySubcategory = Omit<Subcategory, 'inactive_at'>

const subcategoryColumns = 'id, name, category_id, archived_at, inactive_at'
const legacySubcategoryColumns = 'id, name, category_id, archived_at'

function withInactiveStatus(subcategory: LegacySubcategory): Subcategory {
  return { ...subcategory, inactive_at: null }
}

export type SubcategoryStatus = 'active' | 'inactive' | 'archived'

export function subcategoryStatus(subcategory: Pick<Subcategory, 'archived_at' | 'inactive_at'>): SubcategoryStatus {
  if (subcategory.archived_at) return 'archived'
  if (subcategory.inactive_at) return 'inactive'
  return 'active'
}

export function useCategories() {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async (): Promise<Category[]> =>
      unwrap(
        await supabase
          .from('categories')
          .select('id, name, sort_order')
          .order('sort_order')
      ),
    // The fixed four. They do not change.
    staleTime: Infinity,
  })
}

/**
 * Pass a categoryId to narrow; omit for every subcategory on the site.
 * `includeInactive`/`includeArchived` default to false, which is what the
 * expense form's picker wants: active subcategories only.
 */
export function useSubcategories(
  categoryId?: string | null,
  { includeInactive = false, includeArchived = false }: { includeInactive?: boolean; includeArchived?: boolean } = {}
) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.subcategories.forCategory(categoryId ?? null, { includeInactive, includeArchived }),
    queryFn: async (): Promise<Subcategory[]> => {
      let query = supabase
        .from('subcategories')
        .select(subcategoryColumns)
        .order('name')

      if (categoryId) query = query.eq('category_id', categoryId)
      // Inactive/archived subcategories stay on old entries but leave the picker.
      if (!includeInactive) query = query.is('inactive_at', null)
      if (!includeArchived) query = query.is('archived_at', null)

      const response = await query

      // `inactive_at` was added after the original schema. Keep category
      // management usable while an environment is waiting for that migration
      // instead of letting PostgREST reject every read and create operation.
      if (response.error?.code === '42703') {
        let legacyQuery = supabase
          .from('subcategories')
          .select(legacySubcategoryColumns)
          .order('name')

        if (categoryId) legacyQuery = legacyQuery.eq('category_id', categoryId)
        if (!includeArchived) legacyQuery = legacyQuery.is('archived_at', null)

        return unwrap(await legacyQuery).map(withInactiveStatus)
      }

      return unwrap(response)
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreateSubcategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { siteId } = useSession()

  return useMutation({
    mutationFn: async (input: { category_id: string; name: string }) => {
      const created = unwrap(
        await supabase
          .from('subcategories')
          .insert({ ...input, site_id: siteId })
          // Do not make creation depend on the newer status column. This is
          // deliberately compatible with databases that have not yet applied
          // 20260821080700_subcategory_status_delete.sql.
          .select(legacySubcategoryColumns)
          .single()
      )
      return withInactiveStatus(created)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subcategories.all })
    },
  })
}

/** Rename only — `archived_at`/`inactive_at` are the only other columns an Owner can touch (RLS column grant). */
export function useUpdateSubcategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const updated = unwrap(
        await supabase
          .from('subcategories')
          .update({ name })
          .eq('id', id)
          .select(legacySubcategoryColumns)
          .single()
      )
      return withInactiveStatus(updated)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subcategories.all })
    },
  })
}

/**
 * Moves a subcategory between active, inactive, and archived. The two
 * timestamp columns are mutually exclusive (enforced by a DB check
 * constraint), so setting one always clears the other.
 */
export function useSetSubcategoryStatus() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubcategoryStatus }) =>
      unwrap(
        await supabase
          .from('subcategories')
          .update({
            archived_at: status === 'archived' ? new Date().toISOString() : null,
            inactive_at: status === 'inactive' ? new Date().toISOString() : null,
          })
          .eq('id', id)
          .select('id, name, category_id, archived_at, inactive_at')
          .single()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subcategories.all })
    },
  })
}

/**
 * Permanently removes a subcategory. The `expenses.subcategory_id` foreign
 * key has no ON DELETE clause, so the database itself rejects deleting one
 * that's still referenced by an expense (Postgres error 23503) — callers
 * should catch that and suggest archiving instead.
 */
export function useDeleteSubcategory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subcategories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subcategories.all })
    },
  })
}
