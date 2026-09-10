'use client'

import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useCreateVendor, useVendors } from '@/lib/hooks/use-vendors'
import { friendlyMessage, reportError } from '@/lib/errors'

/**
 * Search a vendor by name, or add one on the fly without leaving the
 * expense form (SCOPE.md §3, "vendor searchable, create-on-the-fly").
 */
export function VendorCombobox({
  value,
  onSelect,
  initialLabel,
}: {
  value: string | null
  onSelect: (vendor: { id: string; name: string } | null) => void
  initialLabel?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [label, setLabel] = useState(initialLabel ?? '')
  const { data: vendors = [] } = useVendors(query)
  const createVendor = useCreateVendor()

  const trimmed = query.trim()
  const exactMatch = vendors.some((vendor) => vendor.name.toLowerCase() === trimmed.toLowerCase())

  function select(vendor: { id: string; name: string } | null) {
    onSelect(vendor)
    setLabel(vendor?.name ?? '')
    setQuery('')
    setOpen(false)
  }

  async function handleCreate() {
    try {
      const created = await createVendor.mutateAsync({ name: trimmed, phone: '', gstin: '', notes: '' })
      select(created)
      toast.success(`${created.name} added`)
    } catch (error) {
      reportError(error, friendlyMessage(error, 'Could not add vendor. Try again.'))
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="select-like combobox-trigger">
          <span className={label ? undefined : 'muted'}>{label || 'Search or add a vendor'}</span>
          <ChevronDown size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="combobox-panel" align="start" sideOffset={6}>
          <div className="combobox-search">
            <Search size={15} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a vendor name"
            />
          </div>
          <div className="combobox-list">
            {vendors.map((vendor) => (
              <button type="button" className="combobox-option" key={vendor.id} onClick={() => select(vendor)}>
                <span>{vendor.name}</span>
                {value === vendor.id && <Check size={14} />}
              </button>
            ))}
            {!vendors.length && !trimmed && <p className="combobox-empty">Start typing to search vendors.</p>}
            {trimmed && !exactMatch && (
              <button type="button" className="combobox-create" onClick={handleCreate} disabled={createVendor.isPending}>
                <Plus size={14} /> {createVendor.isPending ? 'Adding…' : `Add "${trimmed}" as a new vendor`}
              </button>
            )}
          </div>
          {value && (
            <button type="button" className="combobox-clear" onClick={() => select(null)}>
              Clear vendor
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
