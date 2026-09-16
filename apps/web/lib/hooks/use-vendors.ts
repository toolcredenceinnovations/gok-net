'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { VendorInput } from '@gok-net/shared'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/auth/session-context'
import { unwrap } from '@/lib/errors'
import { track } from '@/lib/analytics'
import { queryKeys } from './keys'

export interface Vendor {
  id: string
  name: string
  phone: string | null
  gstin: string | null
  notes: string | null
  archived_at: string | null
  category_id: string | null
  subcategory_id: string | null
}

/** Totals from v_vendor_totals — "how much did I pay ABC Traders?" in one query. */
export interface VendorTotals {
  vendor_id: string
  vendor_name: string
  phone: string | null
  transaction_count: number
  total_billed: number
  total_paid: number
  outstanding: number
  last_transaction_date: string | null
  archived_at: string | null
  category_id: string | null
  category_name: string | null
  subcategory_id: string | null
  subcategory_name: string | null
}

/**
 * Vendor picker. `search` runs against the pg_trgm index on vendors.name, so
 * "ABC Trad" finds "ABC Traders".
 */
export function useVendors(search?: string, includeArchived = false) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.vendors.list(search),
    queryFn: async (): Promise<Vendor[]> => {
      let query = supabase
        .from('vendors')
        .select('id, name, phone, gstin, notes, archived_at, category_id, subcategory_id')
        .order('name')
        .limit(50)

      if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`)
      if (!includeArchived) query = query.is('archived_at', null)

      const rows = unwrap(await query)
      if (search?.trim()) track.vendorSearched({ has_results: rows.length > 0 })
      return rows
    },
    staleTime: 60_000,
  })
}

/** The vendors list page: every vendor with billed / paid / outstanding. */
export function useVendorTotals() {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.vendors.totals,
    queryFn: async (): Promise<VendorTotals[]> =>
      unwrap(
        await supabase
          .from('v_vendor_totals')
          .select(
            'vendor_id, vendor_name, phone, transaction_count, total_billed, total_paid, outstanding, last_transaction_date, archived_at, category_id, category_name, subcategory_id, subcategory_name'
          )
          .order('outstanding', { ascending: false })
      ) as VendorTotals[],
  })
}

export function useVendor(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.vendors.detail(id),
    queryFn: async (): Promise<Vendor> =>
      unwrap(
        await supabase
          .from('vendors')
          .select('id, name, phone, gstin, notes, archived_at, category_id, subcategory_id')
          .eq('id', id)
          .single()
      ),
    enabled: Boolean(id),
  })
}

/**
 * Create-on-the-fly from the expense form (SCOPE.md §3, "vendor searchable,
 * create-on-the-fly"). Empty strings are normalised to null so the GSTIN and
 * phone columns stay clean.
 */
export function useCreateVendor() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { siteId } = useSession()

  return useMutation({
    mutationFn: async (input: VendorInput): Promise<Vendor> =>
      unwrap(
        await supabase
          .from('vendors')
          .insert({
            site_id: siteId,
            name: input.name,
            phone: input.phone || null,
            gstin: input.gstin || null,
            notes: input.notes || null,
            category_id: input.category_id || null,
            subcategory_id: input.subcategory_id || null,
          })
          .select('id, name, phone, gstin, notes, archived_at, category_id, subcategory_id')
          .single()
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all })
    },
  })
}

/**
 * Archive, never delete — a vendor with expense history must stay resolvable
 * (SCOPE.md §3). Pass `archived: false` to bring one back.
 */
export function useArchiveVendor() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }): Promise<Vendor> =>
      unwrap(
        await supabase
          .from('vendors')
          .update({ archived_at: archived ? new Date().toISOString() : null })
          .eq('id', id)
          .select('id, name, phone, gstin, notes, archived_at, category_id, subcategory_id')
          .single()
      ),
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.detail(vendor.id) })
    },
  })
}

export function useUpdateVendor() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: VendorInput & { id: string }): Promise<Vendor> =>
      unwrap(
        await supabase
          .from('vendors')
          .update({
            name: input.name,
            phone: input.phone || null,
            gstin: input.gstin || null,
            notes: input.notes || null,
          })
          .eq('id', id)
          .select('id, name, phone, gstin, notes, archived_at, category_id, subcategory_id')
          .single()
      ),
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vendors.detail(vendor.id) })
    },
  })
}
