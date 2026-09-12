'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowRight, ArrowUpRight, ChevronDown, Download, MoreHorizontal, Plus, ReceiptIndianRupee, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { AmountDisplay } from '@/components/shared/amount-display'
import { StatusBadge } from '@/components/shared/status-badge'
import { useMonthSummary, useSpendTrend } from '@/lib/hooks/use-dashboard'
import { useExpenses } from '@/lib/hooks/use-expenses'
import { useSession } from '@/lib/auth/session-context'
import { formatDate } from '@gok-net/shared'

const CATEGORY_TONES = ['amber', 'charcoal', 'sand', 'pale'] as const

const TREND_WINDOWS = {
  '3': { label: '3 months', months: 3 },
  '6': { label: '6 months', months: 6 },
  '12': { label: '12 months', months: 12 },
} as const
type TrendWindow = keyof typeof TREND_WINDOWS

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function monthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number)
  return new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function shortMonthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number)
  return new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })
}

function getChartPaths(values: readonly number[]) {
  const max = Math.max(1, ...values)
  const points = values.map((value, index) => ({
    x: values.length === 1 ? 360 : (index / (values.length - 1)) * 720,
    y: 175 - (value / max) * 160,
  }))
  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`
    const previous = points[index - 1]
    const midpoint = (previous.x + point.x) / 2
    return `${path} C${midpoint} ${previous.y},${midpoint} ${point.y},${point.x} ${point.y}`
  }, '')

  return { line, area: `${line} L720 190 L0 190Z`, last: points.at(-1)! }
}

export default function DashboardPage() {
  const session = useSession()
  const [month] = useState(currentMonth())
  const [trendWindow, setTrendWindow] = useState<TrendWindow>('12')
  const [showAll, setShowAll] = useState(false)

  const { data: summary, isLoading: summaryLoading } = useMonthSummary(month)
  const { data: trend = [], isLoading: trendLoading } = useSpendTrend(12)
  const { data: recentExpenses = [], isLoading: expensesLoading } = useExpenses({ month })

  const windowedTrend = useMemo(() => trend.slice(-TREND_WINDOWS[trendWindow].months), [trend, trendWindow])
  const chartPaths = useMemo(() => getChartPaths(windowedTrend.map((point) => point.total)), [windowedTrend])
  const trendTotal = windowedTrend.reduce((sum, point) => sum + point.total, 0)

  const prevMonthTotal = trend.length >= 2 ? trend[trend.length - 2]?.total ?? 0 : 0
  const thisMonthTotal = summary?.totalSpent ?? 0
  const momChange = prevMonthTotal > 0 ? ((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : null

  const paidPct = summary && summary.totalSpent > 0 ? Math.round((summary.totalPaid / summary.totalSpent) * 100) : 0
  const outstandingPct = summary && summary.totalSpent > 0 ? Math.round((summary.totalOutstanding / summary.totalSpent) * 100) : 0
  const openCount = summary?.byCategory.reduce((n, c) => n + (c.outstanding_amount > 0 ? 1 : 0), 0) ?? 0
  const maxCategory = Math.max(1, ...(summary?.byCategory.map((c) => c.total_amount) ?? [0]))

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening'
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const firstName = session.name.split(' ')[0]

  const shown = recentExpenses.slice(0, showAll ? recentExpenses.length : 4)

  return (
    <div className="dashboard-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">{todayLabel}</p>
          <h1>{greeting}, {firstName}</h1>
          <p className="page-subtitle">Here&rsquo;s what is happening across {session.siteName}.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => window.print()}><Download size={17} /> Export</button>
          <Link className="primary-button" href="/expenses/new"><Plus size={18} /> Add expense</Link>
        </div>
      </section>

      <section className="period-row">
        <div className="period-tabs" aria-label="Report period">
          <button className="is-selected">{monthLabel(month)}</button>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card metric-card-featured">
          <div className="metric-top">
            <span className="metric-icon"><Wallet size={18} /></span>
            <span className="trend neutral">{shortMonthLabel(month)}</span>
          </div>
          <p>Total spent</p>
          <AmountDisplay amount={summaryLoading ? 0 : thisMonthTotal} size="xl" showHelper />
          <div className="metric-foot">
            {momChange !== null ? (
              <span className={momChange >= 0 ? 'up' : 'down'}>
                {momChange >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} {Math.abs(momChange).toFixed(1)}%
              </span>
            ) : (
              <span>&mdash;</span>
            )}
            {' '}vs. last month
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-icon"><ReceiptIndianRupee size={18} /></span>
            <span className="trend up"><ArrowUpRight size={13} /> {paidPct}%</span>
          </div>
          <p>Paid this month</p>
          <AmountDisplay amount={summaryLoading ? 0 : (summary?.totalPaid ?? 0)} size="lg" showHelper />
          <div className="progress-track"><span style={{ width: `${paidPct}%` }} /></div>
          <div className="metric-foot"><strong>{paidPct}%</strong> of monthly spend cleared</div>
        </article>
        <article className="metric-card">
          <div className="metric-top">
            <span className="metric-icon warning"><ArrowUpRight size={18} /></span>
            <span className="trend down">{openCount} open</span>
          </div>
          <p>Outstanding</p>
          <AmountDisplay amount={summaryLoading ? 0 : (summary?.totalOutstanding ?? 0)} size="lg" showHelper />
          <div className="progress-track warning"><span style={{ width: `${outstandingPct}%` }} /></div>
          <div className="metric-foot"><strong>{outstandingPct}%</strong> of monthly spend still open</div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel spend-panel">
          <div className="panel-heading">
            <div>
              <h2>Spending trend</h2>
              <p>Monthly expense movement</p>
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="plain-button trend-range-trigger" aria-label={`Change spending trend duration. Current: ${TREND_WINDOWS[trendWindow].label}`}>
                  {TREND_WINDOWS[trendWindow].label} <ChevronDown size={14} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="trend-range-menu" align="end" sideOffset={8}>
                  <DropdownMenu.RadioGroup value={trendWindow} onValueChange={(value) => setTrendWindow(value as TrendWindow)}>
                    {(Object.entries(TREND_WINDOWS) as [TrendWindow, (typeof TREND_WINDOWS)[TrendWindow]][]).map(([key, range]) => (
                      <DropdownMenu.RadioItem className="trend-range-option" value={key} key={key}>
                        <DropdownMenu.ItemIndicator className="trend-range-check">✓</DropdownMenu.ItemIndicator>
                        {range.label}
                      </DropdownMenu.RadioItem>
                    ))}
                  </DropdownMenu.RadioGroup>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          <div className="chart-summary">
            <AmountDisplay amount={trendTotal} size="lg" />
          </div>
          {trendLoading ? (
            <p className="list-loading">Loading trend…</p>
          ) : (
            <div className="line-chart" aria-label="Spending trend chart">
              <div className="chart-grid-lines"><i /><i /><i /><i /></div>
              <svg viewBox="0 0 720 190" role="img" aria-label="Spending trend for the selected window">
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#c9792b" stopOpacity=".22" />
                    <stop offset="1" stopColor="#c9792b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="area" d={chartPaths.area} />
                <path className="line" d={chartPaths.line} />
                <circle cx={chartPaths.last.x} cy={chartPaths.last.y} r="5" />
              </svg>
              <div className="chart-labels">
                {windowedTrend.map((point) => <span key={point.month}>{shortMonthLabel(point.month)}</span>)}
              </div>
            </div>
          )}
        </article>

        <article className="panel category-panel">
          <div className="panel-heading">
            <div>
              <h2>Spend by category</h2>
              <p>{monthLabel(month)} allocation</p>
            </div>
          </div>
          <div className="category-list">
            {summaryLoading ? (
              <p className="list-loading">Loading…</p>
            ) : summary && summary.byCategory.length ? (
              summary.byCategory.map((item, index) => (
                <div className="category-row" key={item.category_id}>
                  <div>
                    <span>{item.category_name}</span>
                    <strong><AmountDisplay amount={item.total_amount} size="sm" /></strong>
                  </div>
                  <div className="category-track">
                    <i className={CATEGORY_TONES[index % CATEGORY_TONES.length]} style={{ width: `${Math.round((item.total_amount / maxCategory) * 100)}%` }} />
                  </div>
                  <small>{Math.round((item.total_amount / (summary.totalSpent || 1)) * 100)}%</small>
                </div>
              ))
            ) : (
              <p className="list-loading">No spend recorded yet this month.</p>
            )}
          </div>
          <Link className="panel-link" href="/expenses">View all expenses <ArrowRight size={15} /></Link>
        </article>
      </section>

      <section className="panel expenses-panel" id="expenses">
        <div className="panel-heading">
          <div>
            <h2>Recent expenses</h2>
            <p>Latest activity from your team</p>
          </div>
          <div className="panel-actions">
            {recentExpenses.length > 4 && (
              <button className="secondary-button small" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Recent only' : 'Show all'}
              </button>
            )}
            <Link className="plain-link" href="/expenses">View all <ArrowRight size={15} /></Link>
          </div>
        </div>
        <div className="expense-table">
          <div className="expense-table-head">
            <span>Date</span><span>Vendor / description</span><span>Category</span><span>Status</span><span>Amount</span><span />
          </div>
          {expensesLoading ? (
            <p className="list-loading">Loading expenses…</p>
          ) : shown.length ? (
            shown.map((expense) => (
              <Link className="expense-row" href={`/expenses/${expense.id}`} key={expense.id}>
                <span>{formatDate(expense.date)}</span>
                <span className="vendor-cell">
                  <i>{(expense.vendors?.name ?? expense.description).slice(0, 1)}</i>
                  <span><strong>{expense.vendors?.name ?? 'No vendor'}</strong><small>{expense.description}</small></span>
                </span>
                <span>{expense.categories?.name ?? '—'}</span>
                <span><StatusBadge status={expense.status} /></span>
                <span><AmountDisplay amount={expense.amount} size="md" /></span>
                <span className="icon-button" aria-hidden><MoreHorizontal size={18} /></span>
              </Link>
            ))
          ) : (
            <p className="list-loading">No expenses recorded this month yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
