'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Building2, Clock3, Plus, ReceiptText, Search, X } from 'lucide-react'
import { AmountDisplay } from '@/components/shared/amount-display'
import { useVendorTotals } from '@/lib/hooks/use-vendors'
import { useCan } from '@/lib/auth/session-context'

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

function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="empty-state">
      <span>
        <Search size={22} />
      </span>
      <h3>No vendors found</h3>
      <p>{query ? 'Try another name or clear your search.' : 'Add your first vendor to start recording expenses.'}</p>
      {query && (
        <button className="secondary-button" onClick={onClear}>
          Clear search
        </button>
      )}
    </div>
  )
}

export default function VendorsPage() {
  const { data: vendors = [], isLoading } = useVendorTotals()
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const canCreate = useCan('createVendor')

  const filtered = useMemo(
    () =>
      vendors
        .filter((vendor) => showArchived || !vendor.archived_at)
        .filter((vendor) => vendor.vendor_name.toLowerCase().includes(query.toLowerCase())),
    [vendors, query, showArchived]
  )

  const activeCount = vendors.filter((vendor) => !vendor.archived_at).length
  const totalBilled = vendors.reduce((sum, vendor) => sum + vendor.total_billed, 0)
  const totalOutstanding = vendors.reduce((sum, vendor) => sum + vendor.outstanding, 0)

  return (
    <div className="product-page">
      <header className="product-header">
        <div>
          <p className="eyebrow">Directory</p>
          <h1>Vendors</h1>
          <p>See every supplier, contractor and their payment position.</p>
        </div>
        {canCreate && (
          <div className="heading-actions">
            <Link className="primary-button" href="/vendors/new">
              <Plus size={17} /> Add vendor
            </Link>
          </div>
        )}
      </header>

      <section className="mini-stat-grid">
        <MiniStat label="Active vendors" value={String(activeCount)} icon={<Building2 size={18} />} />
        <MiniStat label="Total billed" value={<AmountDisplay amount={totalBilled} size="lg" />} icon={<ReceiptText size={18} />} />
        <MiniStat label="Vendor outstanding" value={<AmountDisplay amount={totalOutstanding} size="lg" />} icon={<Clock3 size={18} />} />
      </section>

      <section className="panel product-list-panel">
        <div className="list-toolbar">
          <label className="product-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vendors" />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={14} />
              </button>
            )}
          </label>
          <button
            className={`secondary-button small ${showArchived ? 'is-active' : ''}`}
            onClick={() => setShowArchived((current) => !current)}
          >
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        </div>

        {isLoading ? (
          <p className="list-loading">Loading vendors…</p>
        ) : filtered.length ? (
          <div className="vendor-grid">
            {filtered.map((vendor) => (
              <Link href={`/vendors/${vendor.vendor_id}`} className="vendor-card" key={vendor.vendor_id}>
                <div className="vendor-card-top">
                  <i>{vendor.vendor_name[0]?.toUpperCase()}</i>
                  <span className={`balance-dot ${vendor.outstanding ? 'has-open' : ''}`}>
                    {vendor.archived_at ? 'Archived' : vendor.outstanding ? 'Open balance' : 'Clear'}
                  </span>
                </div>
                <h3>{vendor.vendor_name}</h3>
                <p>
                  {vendor.transaction_count} expense{vendor.transaction_count === 1 ? '' : 's'}
                </p>
                <div>
                  <span>
                    <small>Total billed</small>
                    <AmountDisplay amount={vendor.total_billed} size="md" />
                  </span>
                  <span>
                    <small>Outstanding</small>
                    <AmountDisplay amount={vendor.outstanding} size="md" />
                  </span>
                </div>
                <footer>
                  {vendor.phone || 'No phone on file'}
                  <ArrowRight size={15} />
                </footer>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState query={query} onClear={() => setQuery('')} />
        )}
      </section>
    </div>
  )
}
