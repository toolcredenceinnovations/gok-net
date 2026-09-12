import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Daily cron (see vercel.json): generates "challan due soon" notifications
 * and purges notifications older than 30 days — the actual retention
 * mechanism, not just a query filter (use-notifications.ts also filters to
 * the last 30 days, but rows really need to age out of the table).
 *
 * New-expense/payment-recorded notifications are NOT generated here — those
 * are DB triggers (see the notifications migration) because those writes
 * happen via direct client RLS inserts, not through a server route. Due
 * dates are time-based, not write-based, so this cron is the only place
 * they can live.
 */
const RETENTION_DAYS = 30
const REMINDER_WINDOW_DAYS = 3

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const today = new Date()
  const todayStr = isoDate(today)
  const windowEnd = isoDate(new Date(today.getTime() + REMINDER_WINDOW_DAYS * 86_400_000))

  const { data: dueExpenses, error: dueError } = await admin
    .from('expenses')
    .select('id, site_id, description, amount, due_date')
    .is('voided_at', null)
    .neq('status', 'paid')
    .not('due_date', 'is', null)
    .gte('due_date', todayStr)
    .lte('due_date', windowEnd)

  if (dueError) {
    return NextResponse.json({ error: 'Could not load due expenses' }, { status: 500 })
  }

  let remindersCreated = 0

  for (const expense of dueExpenses ?? []) {
    const { data: alreadyReminded } = await admin
      .from('notifications')
      .select('id')
      .eq('entity', 'expenses')
      .eq('entity_id', expense.id)
      .eq('type', 'payment_due')
      .gte('created_at', `${todayStr}T00:00:00Z`)
      .limit(1)
    if (alreadyReminded && alreadyReminded.length > 0) continue

    const { data: recipients } = await admin
      .from('user_sites')
      .select('user_id, user_profiles!inner(active)')
      .eq('site_id', expense.site_id)
      .in('role', ['owner', 'admin'])
      .eq('user_profiles.active', true)

    if (!recipients?.length) continue

    const { error: insertError } = await admin.from('notifications').insert(
      recipients.map((recipient: any) => ({
        site_id: expense.site_id,
        user_id: recipient.user_id,
        type: 'payment_due',
        title: 'Challan due soon',
        body: `${expense.description} — ₹${Number(expense.amount).toLocaleString('en-IN')} due ${expense.due_date}`,
        entity: 'expenses',
        entity_id: expense.id,
      }))
    )
    if (!insertError) remindersCreated += recipients.length
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString()
  const { error: purgeError, count: purged } = await admin
    .from('notifications')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  return NextResponse.json({
    data: {
      remindersCreated,
      purged: purged ?? 0,
      purgeError: purgeError?.message ?? null,
    },
  })
}
