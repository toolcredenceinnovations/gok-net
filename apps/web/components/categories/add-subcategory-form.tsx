'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { subcategorySchema, type SubcategoryInput } from '@gok-net/shared'
import { useCreateSubcategory, type Category } from '@/lib/hooks/use-categories'
import { friendlyMessage, reportError } from '@/lib/errors'

export function AddSubcategoryForm({
  categories,
  defaultCategoryId,
  onCancel,
  onCreated,
}: {
  categories: Category[]
  defaultCategoryId?: string
  onCancel: () => void
  onCreated: () => void
}) {
  const createSubcategory = useCreateSubcategory()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubcategoryInput>({
    resolver: zodResolver(subcategorySchema),
    defaultValues: { category_id: defaultCategoryId ?? '', name: '' },
  })

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
    <form className="inline-create" onSubmit={onSubmit}>
      <label>
        <span>New subcategory</span>
        <input autoFocus placeholder="e.g. Plumbing works" {...register('name')} />
        {errors.name && <small className="field-error">{errors.name.message}</small>}
      </label>
      <label>
        <span>Under category</span>
        <select {...register('category_id')} defaultValue={defaultCategoryId ?? ''}>
          <option value="" disabled>
            Select category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category_id && <small className="field-error">Pick a category</small>}
      </label>
      <button type="button" className="secondary-button" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="primary-button" disabled={createSubcategory.isPending}>
        {createSubcategory.isPending ? 'Adding…' : 'Add'}
      </button>
    </form>
  )
}
