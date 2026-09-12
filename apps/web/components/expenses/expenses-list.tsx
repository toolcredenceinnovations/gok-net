'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Calendar, Clock3, Plus, ReceiptText, Search, WalletCards, X } from 'lucide-react'
import { formatDate, type ExpenseStatus } from '@gok-net/shared'
import { AmountDisplay } from '@/components/shared/amount-display'
import { StatusBadge } from '@/components/shared/status-badge'
import { useExpenses } from '@/lib/hooks/use-expenses'
import { useCan } from '@/lib/auth/session-context'

const STATUS_TABS = ['All', 'Paid', 'Partial', 'Unpaid'] as const

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function MiniStat({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <article className="mini-stat">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

export function ExpensesList({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('All')
  const [monthOnly, setMonthOnly] = useState(true)
  const canCreate = useCan('createExpense')

  const { data: expenses = [], isLoading } = useExpenses({
    search: query || undefined,
    status: status === 'All' ? undefined : (status.toLowerCase() as ExpenseStatus),
    month: monthOnly ? currentMonth() : undefined,
  })

  const totalAmount = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses])
  const totalOutstanding = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.outstanding, 0),
    [expenses]
  )

  return (
    <div className="product-page">
      <header className="product-header">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1>Expenses</h1>
          <p>Review, filter and manage every cost recorded for this site.</p>
        </div>
        {canCreate && (
          <div className="heading-actions">
            <Link className="primary-button" href="/expenses/new">
              <Plus size={17} /> Add expense
            </Link>
          </div>
        )}
      </header>

      <section className="mini-stat-grid">
        <MiniStat
          label={monthOnly ? 'This month spend' : 'Total spend'}
          value={<AmountDisplay amount={totalAmount} size="lg" />}
          icon={<WalletCards size={18} />}
        />
        <MiniStat label="Outstanding" value={<AmountDisplay amount={totalOutstanding} size="lg" />} icon={<Clock3 size={18} />} />
        <MiniStat label="Entries" value={String(expenses.length)} icon={<ReceiptText size={18} />} />
      </section>

      <section className="panel product-list-panel">
        <div className="list-toolbar">
          <label className="product-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vendor, description or ID"
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </label>
          <button
            className={`secondary-button small ${monthOnly ? 'is-active' : ''}`}
            onClick={() => setMonthOnly((current) => !current)}
          >
            <Calendar size={15} /> {monthOnly ? 'This month' : 'All time'}
          </button>
        </div>
        <div className="filter-tabs">
          {STATUS_TABS.map((tab) => (
            <button className={status === tab ? 'is-active' : ''} onClick={() => setStatus(tab)} key={tab}>
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="list-loading">Loading expenses…</p>
        ) : expenses.length ? (
          <div className="product-table expense-list">
            <div className="product-table-head">
              <span>Expense</span>
              <span>Category</span>
              <span>Recorded by</span>
              <span>Status</span>
              <span>Amount</span>
              <span />
            </div>
            {expenses.map((expense) => (
              <Link className="product-row" href={`/expenses/${expense.id}`} key={expense.id}>
                <span className="primary-cell">
                  <i>{(expense.vendors?.name ?? expense.description)[0]?.toUpperCase()}</i>
                  <span>
                    <strong>{expense.vendors?.name ?? 'No vendor'}</strong>
                    <small>
                      {formatDate(expense.date)} · {expense.description}
                    </small>
                  </span>
                </span>
                <span>{expense.categories?.name ?? '—'}</span>
                <span>{expense.user_profiles?.name ?? '—'}</span>
                <span>
                  <StatusBadge status={expense.status} />
                </span>
                <span className="amount-cell">
                  <AmountDisplay amount={expense.amount} size="md" />
                  {expense.status !== 'paid' && <small>₹{expense.outstanding.toLocaleString('en-IN')} due</small>}
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>
              <Search size={22} />
            </span>
            <h3>No matching expenses</h3>
            <p>Try removing a filter or search for a different vendor.</p>
            <button
              className="secondary-button"
              onClick={() => {
                setQuery('')
                setStatus('All')
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
