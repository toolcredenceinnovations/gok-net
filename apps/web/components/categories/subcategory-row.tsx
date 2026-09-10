'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Archive, Check, EyeOff, Pencil, RotateCcw, Trash2, X } from 'lucide-react'
import {
  subcategoryStatus,
  useDeleteSubcategory,
  useSetSubcategoryStatus,
  useUpdateSubcategory,
  type Subcategory,
} from '@/lib/hooks/use-categories'
import { friendlyMessage, reportError } from '@/lib/errors'

const STATUS_LABEL = { active: 'Active', inactive: 'Inactive', archived: 'Archived' } as const

export function SubcategoryRow({ subcategory }: { subcategory: Subcategory }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(subcategory.name)
  const updateSubcategory = useUpdateSubcategory()
  const setStatus = useSetSubcategoryStatus()
  const deleteSubcategory = useDeleteSubcategory()
  const status = subcategoryStatus(subcategory)

  function cancelEdit() {
    setEditing(false)
    setName(subcategory.name)
  }

  async function saveRename() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === subcategory.name) {
      cancelEdit()
      return
    }
    try {
      await updateSubcategory.mutateAsync({ id: subcategory.id, name: trimmed })
      toast.success('Subcategory renamed')
      setEditing(false)
    } catch (error) {
      reportError(error, friendlyMessage(error, 'Could not rename subcategory. Try again.'))
    }
  }

  async function changeStatus(next: 'active' | 'inactive' | 'archived') {
    try {
      await setStatus.mutateAsync({ id: subcategory.id, status: next })
      toast.success(`Subcategory ${next === 'active' ? 'restored' : next}`)
    } catch (error) {
      reportError(error, friendlyMessage(error, 'Could not update subcategory. Try again.'))
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${subcategory.name}" permanently? This cannot be undone.`)) return
    try {
      await deleteSubcategory.mutateAsync(subcategory.id)
      toast.success('Subcategory deleted')
    } catch (error) {
      const code = (error as { code?: string } | null)?.code
      if (code === '23503') {
        reportError(error, 'This subcategory is used by existing expenses and can’t be deleted. Archive it instead.')
      } else {
        reportError(error, friendlyMessage(error, 'Could not delete subcategory. Try again.'))
      }
    }
  }

  if (editing) {
    return (
      <div className="category-admin-row is-editing">
        <input
          autoFocus
          className="rename-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') saveRename()
            if (event.key === 'Escape') cancelEdit()
          }}
        />
        <div className="category-admin-row-actions">
          <button aria-label="Save" onClick={saveRename} disabled={updateSubcategory.isPending}>
            <Check size={14} />
          </button>
          <button aria-label="Cancel" onClick={cancelEdit}>
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  const busy = setStatus.isPending || deleteSubcategory.isPending

  return (
    <div className={`category-admin-row${status !== 'active' ? ' is-archived' : ''}`}>
      <span>{subcategory.name}</span>
      <em className={`status-pill${status !== 'active' ? ' is-archived' : ''}`}>{STATUS_LABEL[status]}</em>
      <div className="category-admin-row-actions">
        <button aria-label="Rename" onClick={() => setEditing(true)} disabled={status !== 'active'}>
          <Pencil size={14} />
        </button>
        {status === 'active' && (
          <button aria-label="Mark inactive" onClick={() => changeStatus('inactive')} disabled={busy}>
            <EyeOff size={14} />
          </button>
        )}
        {status === 'inactive' && (
          <button aria-label="Restore" onClick={() => changeStatus('active')} disabled={busy}>
            <RotateCcw size={14} />
          </button>
        )}
        {status !== 'archived' ? (
          <button aria-label="Archive" onClick={() => changeStatus('archived')} disabled={busy}>
            <Archive size={14} />
          </button>
        ) : (
          <button aria-label="Restore" onClick={() => changeStatus('active')} disabled={busy}>
            <RotateCcw size={14} />
          </button>
        )}
        <button aria-label="Delete" onClick={handleDelete} disabled={busy}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
