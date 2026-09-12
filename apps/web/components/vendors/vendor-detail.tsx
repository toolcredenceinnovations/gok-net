'use client'

import Link from 'next/link'
import { toast } from 'sonner'
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Plus,
  ReceiptText,
  RotateCcw,
} from 'lucide-react'
import { formatDate } from '@gok-net/shared'
import { AmountDisplay } from '@/components/shared/amount-display'
import { StatusBadge } from '@/components/shared/status-badge'
import { useArchiveVendor, useVendor, useVendorTotals } from '@/lib/hooks/use-vendors'
import { useExpenses } from '@/lib/hooks/use-expenses'
import { useCan } from '@/lib/auth/session-context'
import { friendlyMessage, reportError } from '@/lib/errors'

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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function VendorDetail({ id }: { id: string }) {
  const { data: vendor, isLoading } = useVendor(id)
  const { data: totals = [] } = useVendorTotals()
  const { data: vendorExpenses = [] } = useExpenses({ vendorId: id })
  const archiveVendor = useArchiveVendor()
  const canEdit = useCan('editVendor')

  const totalsRow = totals.find((t) => t.vendor_id === id)

  if (isLoading) return <p className="list-loading">Loading vendor…</p>
  if (!vendor) {
    return (
      <div className="product-page detail-page">
        <Link className="back-link" href="/vendors">
          <ArrowLeft size={15} /> All vendors
        </Link>
        <p className="list-loading">Vendor not found.</p>
      </div>
    )
  }

  async function toggleArchive() {
    if (!vendor) return
    try {
      await archiveVendor.mutateAsync({ id: vendor.id, archived: !vendor.archived_at })
      toast.success(vendor.archived_at ? 'Vendor restored' : 'Vendor archived')
    } catch (error) {
      reportError(error, friendlyMessage(error))
    }
  }

  return (
    <div className="product-page detail-page">
      <Link className="back-link" href="/vendors">
        <ArrowLeft size={15} /> All vendors
      </Link>
      <header className="product-header">
        <div>
          <p className="eyebrow">{vendor.archived_at ? 'Archived vendor' : 'Vendor'}</p>
          <h1>{vendor.name}</h1>
          <p>
            {totalsRow?.transaction_count ?? 0} expense{totalsRow?.transaction_count === 1 ? '' : 's'} recorded
          </p>
        </div>
        <div className="heading-actions">
          {canEdit && (
            <Link className="secondary-button" href={`/vendors/${id}/edit`}>
              Edit vendor
            </Link>
          )}
          {canEdit && (
            <button className="secondary-button" onClick={toggleArchive} disabled={archiveVendor.isPending}>
              {vendor.archived_at ? (
                <>
                  <RotateCcw size={15} /> Restore
                </>
              ) : (
                <>
                  <Archive size={15} /> Archive
                </>
              )}
            </button>
          )}
          <Link className="primary-button" href={`/expenses/new?vendorId=${id}`}>
            <Plus size={17} /> New expense
          </Link>
        </div>
      </header>

      <section className="mini-stat-grid">
        <MiniStat
          label="Total billed"
          value={<AmountDisplay amount={totalsRow?.total_billed ?? 0} size="lg" />}
          icon={<ReceiptText size={18} />}
        />
        <MiniStat
          label="Total paid"
          value={<AmountDisplay amount={totalsRow?.total_paid ?? 0} size="lg" />}
          icon={<CheckCircle2 size={18} />}
        />
        <MiniStat
          label="Outstanding"
          value={<AmountDisplay amount={totalsRow?.outstanding ?? 0} size="lg" />}
          icon={<Clock3 size={18} />}
        />
      </section>

      <section className="detail-grid">
        <article className="panel product-list-panel detail-main">
          <div className="panel-heading">
            <div>
              <h2>Expense history</h2>
              <p>All transactions with this vendor</p>
            </div>
          </div>
          {vendorExpenses.length ? (
            <div className="compact-list">
              {vendorExpenses.map((expense) => (
                <Link href={`/expenses/${expense.id}`} key={expense.id}>
                  <span>
                    <strong>{expense.description}</strong>
                    <small>
                      {formatDate(expense.date)} · {expense.categories?.name ?? 'Uncategorised'}
                    </small>
                  </span>
                  <StatusBadge status={expense.status} />
                  <AmountDisplay amount={expense.amount} size="md" />
                  <ArrowRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="list-loading">No expenses recorded for this vendor yet.</p>
          )}
        </article>
        <aside className="detail-aside">
          <article className="panel info-card">
            <h2>Contact details</h2>
            <Info label="Phone" value={vendor.phone || '—'} />
            <Info label="GSTIN" value={vendor.gstin || '—'} />
          </article>
          {vendor.notes && (
            <article className="panel note-card">
              <h2>Internal note</h2>
              <p>{vendor.notes}</p>
            </article>
          )}
        </aside>
      </section>
    </div>
  )
}
