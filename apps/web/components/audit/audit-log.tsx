'use client'

import { Fragment, useMemo, useState } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  KeyRound,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { formatDate } from '@gok-net/shared'
import { useAuditLog } from '@/lib/hooks/use-team'

const ACTION_ICON: Record<string, LucideIcon> = {
  created: Plus,
  updated: RotateCcw,
  voided: Trash2,
  restored: RotateCcw,
  payment_recorded: Check,
  deleted: Trash2,
  pin_used: KeyRound,
  pin_failed: KeyRound,
  login: ShieldCheck,
  member_added: UserPlus,
}

function iconFor(action: string): LucideIcon {
  return ACTION_ICON[action] ?? Upload
}

function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function AuditLog() {
  const [query, setQuery] = useState('')
  const [entityFilter, setEntityFilter] = useState('All')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const { data: entries = [], isLoading } = useAuditLog()

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const entities = useMemo(() => ['All', ...new Set(entries.map((e) => e.entity))], [entries])

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (entityFilter !== 'All' && entry.entity !== entityFilter) return false
        if (!query.trim()) return true
        const haystack = `${entry.action} ${entry.entity} ${entry.actor?.name ?? ''}`.toLowerCase()
        return haystack.includes(query.trim().toLowerCase())
      }),
    [entries, entityFilter, query]
  )

  return (
    <div className="product-page">
      <header className="product-header">
        <div>
          <p className="eyebrow">Compliance</p>
          <h1>Audit log</h1>
          <p>An append-only record of every important action across the site.</p>
        </div>
      </header>

      <section className="panel product-list-panel">
        <div className="list-toolbar">
          <label className="product-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions or people" />
          </label>
          <select className="secondary-button small" value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
            {entities.map((entity) => (
              <option key={entity} value={entity}>
                {entity === 'All' ? 'All entities' : entity}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="list-loading">Loading audit log…</p>
        ) : filtered.length ? (
          <div className="audit-list">
            {filtered.map((entry) => {
              const Icon = iconFor(entry.action)
              const hasDetail = Boolean(entry.before_json || entry.after_json)
              const isOpen = expanded.has(entry.id)
              return (
                <Fragment key={entry.id}>
                  <div className="audit-row">
                    <i>
                      <Icon size={15} />
                    </i>
                    <span>
                      <strong>{actionLabel(entry.action)}</strong>
                      <small>
                        {entry.actor?.name ?? 'System'} · {entry.entity}
                        {entry.entity_id ? ` · ${entry.entity_id.slice(0, 8)}` : ''}
                      </small>
                    </span>
                    <em>{entry.entity}</em>
                    <time>{formatDate(entry.created_at)}</time>
                    {hasDetail ? (
                      <button className="icon-button" aria-label="Toggle details" onClick={() => toggle(entry.id)}>
                        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                  {isOpen && hasDetail && (
                    <div style={{ gridColumn: '1 / -1', padding: '0 8px 12px 46px' }}>
                      <pre className="rounded-lg bg-neutral-50 p-3 text-[10px] text-neutral-600 overflow-x-auto">
                        {JSON.stringify({ before: entry.before_json, after: entry.after_json }, null, 2)}
                      </pre>
                    </div>
                  )}
                </Fragment>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <span>
              <Calendar size={22} />
            </span>
            <h3>No matching activity</h3>
            <p>Try a different search or entity filter.</p>
          </div>
        )}
        <div className="audit-note">
          <ShieldCheck size={16} /> Audit records cannot be edited or deleted.
        </div>
      </section>
    </div>
  )
}
