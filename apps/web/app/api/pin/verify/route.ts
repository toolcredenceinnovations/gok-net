import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { paymentSchema, voidSchema } from '@sitekhata/shared'

/**
 * The PIN gate. This route both VERIFIES the PIN and PERFORMS the write.
 *
 * It deliberately does not mint an "action token" for the client to spend —
 * that pattern is only as strong as the client honouring it. Here the write
 * is impossible without a correct PIN, because `payments` grants no insert to
 * `authenticated` and the void columns on `expenses` are not in that role's
 * column grants. The service role below is the only way through, and it is
 * only reached after bcrypt.compare succeeds.
 *
 * Layered per SCOPE.md §1: role gate first, PIN second, audit trail third.
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  // ── 1. session ───────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  // ── 2. role gate — only owner/admin may even attempt this ────────────────
  const [{ data: role }, { data: siteId }] = await Promise.all([
    supabase.rpc('current_user_role'),
    supabase.rpc('current_user_site_id'),
  ])

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'You do not have permission for this' }, { status: 403 })
  }
  if (!siteId) return NextResponse.json({ error: 'No active site' }, { status: 400 })

  const { action, pin, payload } = await request.json()
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'The PIN is 6 digits' }, { status: 400 })
  }

  // ── 3. PIN check, server-side only ───────────────────────────────────────
  const admin = createAdminClient()
  const { data: site } = await admin
    .from('sites')
    .select('settings')
    .eq('id', siteId)
    .single()

  const pinHash = (site?.settings as { pin_hash?: string } | null)?.pin_hash
  if (!pinHash) {
    return NextResponse.json({ error: 'No PIN has been set up yet' }, { status: 400 })
  }

  if (!(await bcrypt.compare(pin, pinHash))) {
    // A failed attempt is itself worth recording — the operator panel
    // watches for spikes.
    await admin.from('audit_log').insert({
      site_id: siteId,
      actor_id: user.id,
      action: 'pin_failed',
      entity: 'sites',
      entity_id: siteId,
    })
    return NextResponse.json({ error: 'That PIN is not right' }, { status: 403 })
  }

  // ── 4. perform the write, as service role ────────────────────────────────
  try {
    switch (action) {
      case 'record_payment': {
        const parsed = paymentSchema.safeParse({ ...payload, paid_by: payload?.paid_by ?? user.id })
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? 'Check the payment details' },
            { status: 400 }
          )
        }

        // Confirm the target expense really belongs to the caller's site.
        const { data: expense } = await admin
          .from('expenses')
          .select('id, site_id, voided_at')
          .eq('id', parsed.data.expense_id)
          .single()

        if (!expense || expense.site_id !== siteId) {
          return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
        }
        if (expense.voided_at) {
          return NextResponse.json({ error: 'That entry is voided' }, { status: 409 })
        }

        const { data, error } = await admin
          .from('payments')
          .insert({ ...parsed.data, created_by: user.id })
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ data })
      }

      case 'void_expense': {
        const parsed = voidSchema.safeParse(payload)
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? 'A reason is required' },
            { status: 400 }
          )
        }
        const id = payload?.expense_id
        if (typeof id !== 'string') {
          return NextResponse.json({ error: 'Which entry?' }, { status: 400 })
        }

        const { data, error } = await admin
          .from('expenses')
          .update({
            voided_at: new Date().toISOString(),
            voided_by: user.id,
            void_reason: parsed.data.reason,
          })
          .eq('id', id)
          .eq('site_id', siteId)
          .is('voided_at', null)
          .select()
          .single()

        if (error) throw error
        if (!data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
        return NextResponse.json({ data })
      }

      case 'void_payment': {
        const parsed = voidSchema.safeParse(payload)
        if (!parsed.success) {
          return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? 'A reason is required' },
            { status: 400 }
          )
        }
        const id = payload?.payment_id
        if (typeof id !== 'string') {
          return NextResponse.json({ error: 'Which payment?' }, { status: 400 })
        }

        const { data, error } = await admin
          .from('payments')
          .update({
            voided_at: new Date().toISOString(),
            voided_by: user.id,
            void_reason: parsed.data.reason,
          })
          .eq('id', id)
          .is('voided_at', null)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ data })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    console.error('pin/verify failed', err)
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  }
}
