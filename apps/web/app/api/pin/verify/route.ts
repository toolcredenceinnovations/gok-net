import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/session'
import { paymentSchema, voidSchema } from '@gok-net/shared'

/**
 * The PIN gate. This route both VERIFIES the PIN and PERFORMS the write.
 *
 * It deliberately does not mint an "action token" for the client to spend —
 * that pattern is only as strong as the client honouring it. Here the write
 * is impossible without a correct PIN, because `payments` grants no insert to
 * `anon`/`authenticated` and the void columns on `expenses` are not in that
 * role's column grants. The service role below is the only way through, and
 * it is only reached after bcrypt.compare succeeds.
 *
 * Layered per SCOPE.md §1: role gate first, PIN second, audit trail third.
 * AUTH REMOVED (temporary): "session" is the fixed identity from
 * lib/auth/session.ts, not a real login — this gate still holds regardless.
 */
export async function POST(request: Request) {
  // ── 1. session ───────────────────────────────────────────────────────────
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const user = { id: session.userId }

  // ── 2. role gate — only owner/admin may even attempt this ────────────────
  const role = session.role
  const siteId = session.siteId

  if (role !== 'owner' && role !== 'admin') {
    return NextResponse.json({ error: 'You do not have permission for this' }, { status: 403 })
  }

  let requestBody: { action?: unknown; pin?: unknown; payload?: Record<string, unknown> }
  try {
    requestBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { action, pin, payload } = requestBody
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'The PIN is 6 digits' }, { status: 400 })
  }

  // ── 3. PIN check, server-side only ───────────────────────────────────────
  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error('pin/verify is not configured', error)
    return NextResponse.json(
      { error: 'Payment service is not configured. Ask an administrator to add the server key.' },
      { status: 503 }
    )
  }

  const { data: site, error: siteError } = await admin
    .from('sites')
    .select('settings')
    .eq('id', siteId)
    .single()

  if (siteError) {
    console.error('pin/verify could not load site settings', siteError)
    return NextResponse.json({ error: 'Could not load the action PIN settings. Try again.' }, { status: 503 })
  }

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
          .select('id, site_id, amount, voided_at')
          .eq('id', parsed.data.expense_id)
          .single()

        if (!expense || expense.site_id !== siteId) {
          return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
        }
        if (expense.voided_at) {
          return NextResponse.json({ error: 'That entry is voided' }, { status: 409 })
        }

        const [{ data: payer }, { data: existingPayments }] = await Promise.all([
          admin
            .from('user_sites')
            .select('user_id, user_profiles!inner(active)')
            .eq('site_id', siteId)
            .eq('user_id', parsed.data.paid_by)
            .eq('user_profiles.active', true)
            .maybeSingle(),
          admin.from('payments').select('amount').eq('expense_id', expense.id).is('voided_at', null),
        ])

        if (!payer) {
          return NextResponse.json({ error: 'The selected payer is not an active site member' }, { status: 400 })
        }

        const totalPaid = (existingPayments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0)
        const outstanding = Math.max(0, Number(expense.amount) - totalPaid)
        if (outstanding <= 0) {
          return NextResponse.json({ error: 'That expense is already fully paid' }, { status: 409 })
        }
        if (parsed.data.amount > outstanding) {
          return NextResponse.json(
            { error: `Payment cannot exceed the outstanding balance of ₹${outstanding.toLocaleString('en-IN')}` },
            { status: 409 }
          )
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

        const { data: target } = await admin
          .from('payments')
          .select('id, expense_id, expenses!inner(site_id)')
          .eq('id', id)
          .eq('expenses.site_id', siteId)
          .is('voided_at', null)
          .maybeSingle()

        if (!target) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

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
        if (!data) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
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
