import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWeeklySummaryEmail } from '@/lib/email'

/**
 * Weekly cron (see vercel.json, Monday mornings): one email per site to its
 * owner/admin members with an email on file (magic-link users only — phone
 * OTP members, per AUTH.md, may have none).
 *
 * Vercel Cron + react-email + the existing Resend fetch in lib/email.ts,
 * chosen over Supabase Cron (would still need an Edge Function or a pg_net
 * call back to this same app — more moving parts) and over Inngest/Trigger.dev
 * (built for far higher volume than one email/week for 4-6 users).
 */
export async function GET(request: Request) {
  if (process.env.CRON_SECRET) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 86_400_000)
  const weekLabel = `${weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const { data: sites, error: sitesError } = await admin
    .from('sites')
    .select('id, name')
    .is('archived_at', null)
  if (sitesError) return NextResponse.json({ error: 'Could not load sites' }, { status: 500 })

  let sent = 0
  const errors: string[] = []

  for (const site of sites ?? []) {
    const { data: expenses } = await admin
      .from('expenses')
      .select('amount, status, categories(name)')
      .eq('site_id', site.id)
      .is('voided_at', null)
      .gte('date', weekStart.toISOString().slice(0, 10))

    if (!expenses || expenses.length === 0) continue

    const totalSpent = expenses.reduce((sum, expense: any) => sum + Number(expense.amount), 0)
    const totalPaid = expenses
      .filter((expense: any) => expense.status === 'paid')
      .reduce((sum, expense: any) => sum + Number(expense.amount), 0)

    const byCategory = new Map<string, number>()
    for (const expense of expenses as any[]) {
      const name = expense.categories?.name ?? 'Uncategorised'
      byCategory.set(name, (byCategory.get(name) ?? 0) + Number(expense.amount))
    }
    const topCategories = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }))

    const { data: recipients } = await admin
      .from('user_sites')
      .select('user_id, user_profiles!inner(active)')
      .eq('site_id', site.id)
      .in('role', ['owner', 'admin'])
      .eq('user_profiles.active', true)

    for (const recipient of recipients ?? []) {
      const { data: userResult } = await admin.auth.admin.getUserById((recipient as any).user_id)
      const email = userResult?.user?.email
      if (!email) continue

      try {
        await sendWeeklySummaryEmail(email, {
          siteName: site.name,
          weekLabel,
          totalSpent,
          totalPaid,
          totalOutstanding: totalSpent - totalPaid,
          entryCount: expenses.length,
          topCategories,
        })
        sent += 1
      } catch (error) {
        errors.push(error instanceof Error ? error.message : 'Could not send to a recipient')
      }
    }
  }

  return NextResponse.json({ data: { sent, errors } })
}
