'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/lib/auth/session-context'
import { unwrap } from '@/lib/errors'
import { track } from '@/lib/analytics'
import { queryKeys } from './keys'

/**
 * Attachments live in a PRIVATE storage bucket. Nothing is ever served from a
 * public URL — the row stores a path, and viewing one mints a short-lived
 * signed URL.
 *
 * The path convention is load-bearing: the first segment is the site_id, and
 * the storage policies key off exactly that
 * (`(storage.foldername(name))[1] = current_user_site_id()::text`). Change the
 * shape here and the policy silently stops matching.
 *
 *   {site_id}/expenses/{expense_id}/{uuid}.{ext}
 *   {site_id}/payments/{payment_id}/{uuid}.{ext}
 */

const BUCKET = 'attachments'
const SIGNED_URL_TTL = 60 * 10 // 10 minutes

export type AttachmentType = 'invoice' | 'challan' | 'other'

export interface Attachment {
  id: string
  type: AttachmentType
  file_path: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_at: string
  uploaded_by: string
}

export function useAttachments(parent: { expenseId?: string; paymentId?: string }) {
  const supabase = createClient()
  const { expenseId, paymentId } = parent

  return useQuery({
    queryKey: expenseId
      ? queryKeys.attachments.forExpense(expenseId)
      : queryKeys.attachments.forPayment(paymentId!),
    queryFn: async (): Promise<Attachment[]> => {
      const query = supabase
        .from('attachments')
        .select('id, type, file_path, mime_type, size_bytes, uploaded_at, uploaded_by')
        .order('uploaded_at', { ascending: false })

      return unwrap(
        await (expenseId ? query.eq('expense_id', expenseId) : query.eq('payment_id', paymentId!))
      ) as Attachment[]
    },
    enabled: Boolean(expenseId || paymentId),
  })
}

/**
 * Mints a signed URL on demand rather than for the whole list up front —
 * most attachments are never opened, and every signed URL is a request.
 */
export function useSignedUrl(filePath: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['attachment-url', filePath],
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath!, SIGNED_URL_TTL)
      if (error) throw error
      return data.signedUrl
    },
    enabled: Boolean(filePath),
    // Refetch before the URL expires rather than handing out a dead link.
    staleTime: (SIGNED_URL_TTL - 60) * 1000,
    gcTime: SIGNED_URL_TTL * 1000,
  })
}

export function useUploadAttachment() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { siteId, userId } = useSession()

  return useMutation({
    mutationFn: async ({
      file,
      type,
      expenseId,
      paymentId,
      source = 'file',
    }: {
      file: File
      type: AttachmentType
      expenseId?: string
      paymentId?: string
      source?: 'camera' | 'file'
    }): Promise<Attachment> => {
      if (!expenseId && !paymentId) {
        throw new Error('An attachment needs an expense or a payment to belong to')
      }

      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const folder = expenseId ? `expenses/${expenseId}` : `payments/${paymentId}`
      const filePath = `${siteId}/${folder}/${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      // The row is what the app reads; the object is just bytes. If this
      // insert fails the object is orphaned, so clean it up rather than
      // leaving a file nothing points at.
      try {
        const row = unwrap(
          await supabase
            .from('attachments')
            .insert({
              expense_id: expenseId ?? null,
              payment_id: paymentId ?? null,
              type,
              file_path: filePath,
              mime_type: file.type || null,
              size_bytes: file.size,
              uploaded_by: userId,
            })
            .select('id, type, file_path, mime_type, size_bytes, uploaded_at, uploaded_by')
            .single()
        ) as Attachment

        if (type !== 'other') track.attachmentUploaded({ type, source })
        return row
      } catch (error) {
        await supabase.storage.from(BUCKET).remove([filePath])
        throw error
      }
    },
    onSuccess: (_row, variables) => {
      if (variables.expenseId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.attachments.forExpense(variables.expenseId),
        })
      }
      if (variables.paymentId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.attachments.forPayment(variables.paymentId),
        })
      }
    },
  })
}
