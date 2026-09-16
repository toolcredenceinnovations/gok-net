'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { subcategorySchema, type SubcategoryInput } from '@gok-net/shared'
import { useCreateSubcategory, type Category } from '@/lib/hooks/use-categories'
import { friendlyMessage, reportError } from '@/lib/errors'
import { Modal } from '@/components/shared/modal'

export function AddSubcategoryForm({
  open,
  categories,
  defaultCategoryId,
  onCancel,
  onCreated,
}: {
  open: boolean
  categories: Category[]
  defaultCategoryId?: string
  onCancel: () => void
  onCreated: () => void
}) {
  const createSubcategory = useCreateSubcategory()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubcategoryInput>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: { category_id: defaultCategoryId ?? '', name: '' },
  })

  // Fresh form each time the modal opens, with the triggering category preselected.
  useEffect(() => {
    if (open) reset({ category_id: defaultCategoryId ?? '', name: '' })
  }, [open, defaultCategoryId, reset])

  const onSubmit = handleSubmit(async (input) => {
    try {
      await createSubcategory.mutateAsync(input)
      toast.success('Subcategory added')
      onCreated()
    } catch (error) {
      reportError(error, friendlyMessage(error, 'Could not add subcategory. Try again.'))
    }
  })

  return (
    <Modal open={open} onClose={onCancel} title="New subcategory" className="max-w-sm">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input
            autoFocus
            placeholder="e.g. Plumbing works"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            {...register('name')}
          />
          {errors.name && <small className="text-xs text-red-700">{errors.name.message}</small>}
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Under category</span>
          <select
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            {...register('category_id')}
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && <small className="text-xs text-red-700">Pick a category</small>}
        </label>

        <div className="mt-2 flex gap-3">
          <button type="button" className="secondary-button flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary-button flex-1" disabled={createSubcategory.isPending}>
            {createSubcategory.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
