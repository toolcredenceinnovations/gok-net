'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Check, Clock3, Search, ShieldCheck, X } from 'lucide-react'
import { formatDate, PAYMENT_MODES } from '@gok-net/shared'
import { AmountDisplay } from '@/components/shared/amount-display'
import { useRecentPayments, type PaymentRow } from '@/lib/hooks/use-payments'

const MODE_LABEL: Record<(typeof PAYMENT_MODES)[number], string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  voucher: 'Voucher',
}

interface RecentPaymentRow extends PaymentRow {
  expenses: { id: string; description: string; amount: number; vendors: { name: string } | null } | null
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

export function PaymentsList() {
  const { data, isLoading } = useRecentPayments()
  const payments = (data ?? []) as unknown as RecentPaymentRow[]

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'All' | (typeof PAYMENT_MODES)[number]>('All')
  const [payer, setPayer] = useState('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const payers = useMemo(
    () => Array.from(new Map(payments.filter((p) => p.paid_by_profile).map((p) => [p.paid_by_profile!.id, p.paid_by_profile!])).values()),
    [payments]
  )

  const filtered = useMemo(
    () =>
      payments.filter((payment) => {
        if (mode !== 'All' && payment.mode !== mode) return false
        if (payer !== 'All' && payment.paid_by_profile?.id !== payer) return false
        if (dateFrom && payment.paid_on < dateFrom) return false
        if (dateTo && payment.paid_on > dateTo) return false
        if (!query.trim()) return true
        const haystack = `${payment.expenses?.vendors?.name ?? ''} ${payment.expenses?.description ?? ''}`.toLowerCase()
        return haystack.includes(query.trim().toLowerCase())
      }),
    [payments, mode, payer, dateFrom, dateTo, query]
  )

  const thisMonth = new Date().toISOString().slice(0, 7)
  const paidThisMonth = payments
    .filter((p) => p.paid_on.startsWith(thisMonth))
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const cashTotal = payments.filter((p) => p.mode === 'cash').reduce((sum, p) => sum + Number(p.amount), 0)
  const chequeTotal = payments.filter((p) => p.mode === 'cheque').reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="product-page">
      <header className="product-header">
        <div>
          <p className="eyebrow">Cash movement</p>
          <h1>Payments</h1>
          <p>Track payments, part-payments and how each entry was settled.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => window.print()}>
            Export
          </button>
        </div>
      </header>

      <section className="mini-stat-grid">
        <MiniStat label="Paid this month" value={<AmountDisplay amount={paidThisMonth} size="lg" />} icon={<Check size={18} />} />
        <MiniStat label="Cash payments" value={<AmountDisplay amount={cashTotal} size="lg" />} icon={<ShieldCheck size={18} />} />
        <MiniStat label="Cheque payments" value={<AmountDisplay amount={chequeTotal} size="lg" />} icon={<Clock3 size={18} />} />
      </section>

      <section className="panel product-list-panel">
        <div className="list-toolbar">
          <label className="product-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vendor or description" />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </label>
          <select aria-label="Filter by payer" value={payer} onChange={(event) => setPayer(event.target.value)}>
            <option value="All">All payers</option>
            {payers.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
          </select>
          <label className="field">
            <span>From</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
        <div className="filter-tabs">
          <button className={mode === 'All' ? 'is-active' : ''} onClick={() => setMode('All')}>
            All payments
          </button>
          {PAYMENT_MODES.map((item) => (
            <button className={mode === item ? 'is-active' : ''} onClick={() => setMode(item)} key={item}>
              {MODE_LABEL[item]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="list-loading">Loading payments…</p>
        ) : filtered.length ? (
          <div className="payment-list">
            {filtered.map((payment) => (
              <Link href={payment.expenses ? `/expenses/${payment.expenses.id}` : '/payments'} key={payment.id}>
                <i>
                  <Check size={15} />
                </i>
                <span>
                  <strong>{payment.expenses?.vendors?.name ?? payment.expenses?.description ?? 'Expense'}</strong>
                  <small>
                    {formatDate(payment.paid_on)} · {MODE_LABEL[payment.mode]} · Paid by {payment.paid_by_profile?.name ?? '—'}
                  </small>
                </span>
                <span>
                  <small>Against {payment.expenses?.description ?? '—'}</small>
                  <AmountDisplay amount={payment.amount} size="md" />
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
            <h3>No matching payments</h3>
            <p>Try a different search, date range, payer, or mode.</p>
            {(query || mode !== 'All' || payer !== 'All' || dateFrom || dateTo) && (
              <button className="secondary-button" onClick={() => { setQuery(''); setMode('All'); setPayer('All'); setDateFrom(''); setDateTo('') }}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
