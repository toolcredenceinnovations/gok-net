'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Building2, Clock3, LayoutGrid, Plus, ReceiptText, Rows3, Search, X } from 'lucide-react'
import { AmountDisplay } from '@/components/shared/amount-display'
import { useVendorTotals } from '@/lib/hooks/use-vendors'
import { useCategories } from '@/lib/hooks/use-categories'
import { useCan } from '@/lib/auth/session-context'

const ALL_CATEGORIES = 'All'
type ViewMode = 'card' | 'list'

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
  const { data: categories = [] } = useCategories()
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES)
  const [view, setView] = useState<ViewMode>('card')
  const canCreate = useCan('createVendor')

  const filtered = useMemo(
    () =>
      vendors
        .filter((vendor) => showArchived || !vendor.archived_at)
        .filter((vendor) => vendor.vendor_name.toLowerCase().includes(query.toLowerCase()))
        .filter((vendor) => categoryFilter === ALL_CATEGORIES || vendor.category_id === categoryFilter),
    [vendors, query, showArchived, categoryFilter]
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
          <div className="view-toggle" role="tablist" aria-label="Vendor view">
            <button
              type="button"
              className={view === 'card' ? 'is-active' : ''}
              aria-label="Card view"
              onClick={() => setView('card')}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={view === 'list' ? 'is-active' : ''}
              aria-label="List view"
              onClick={() => setView('list')}
            >
              <Rows3 size={15} />
            </button>
          </div>
        </div>

        <div className="filter-tabs">
          <button className={categoryFilter === ALL_CATEGORIES ? 'is-active' : ''} onClick={() => setCategoryFilter(ALL_CATEGORIES)}>
            All
          </button>
          {categories.map((category) => (
            <button
              className={categoryFilter === category.id ? 'is-active' : ''}
              onClick={() => setCategoryFilter(category.id)}
              key={category.id}
            >
              {category.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="list-loading">Loading vendors…</p>
        ) : filtered.length ? view === 'card' ? (
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
                  {vendor.category_name ?? 'Uncategorised'} · {vendor.transaction_count} expense
                  {vendor.transaction_count === 1 ? '' : 's'}
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
          <div className="product-table vendor-list">
            <div className="product-table-head">
              <span>Vendor</span>
              <span>Category</span>
              <span>Expenses</span>
              <span>Billed</span>
              <span>Outstanding</span>
              <span />
            </div>
            {filtered.map((vendor) => (
              <Link className="product-row" href={`/vendors/${vendor.vendor_id}`} key={vendor.vendor_id}>
                <span className="primary-cell">
                  <i>{vendor.vendor_name[0]?.toUpperCase()}</i>
                  <span>
                    <strong>{vendor.vendor_name}</strong>
                    <small>{vendor.phone || 'No phone on file'}</small>
                  </span>
                </span>
                <span>{vendor.category_name ?? '—'}</span>
                <span>
                  {vendor.transaction_count} expense{vendor.transaction_count === 1 ? '' : 's'}
                </span>
                <span className="amount-cell">
                  <AmountDisplay amount={vendor.total_billed} size="md" />
                </span>
                <span className="amount-cell">
                  <AmountDisplay amount={vendor.outstanding} size="md" />
                  {vendor.archived_at && <small>Archived</small>}
                </span>
                <ArrowRight size={16} />
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
