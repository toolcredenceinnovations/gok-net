'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Calendar, IndianRupee, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { expenseSchema, type ExpenseInput } from '@sitekhata/shared'
import { useCategories, useSubcategories } from '@/lib/hooks/use-categories'
import { useCreateExpense, useUpdateExpense, type ExpenseRow } from '@/lib/hooks/use-expenses'
import { VendorCombobox } from '@/components/vendors/vendor-combobox'
import { friendlyMessage, reportError } from '@/lib/errors'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Shared by /expenses/new and /expenses/[id]/edit — same fields either way. */
export function ExpenseForm({ expense, defaultVendorId }: { expense?: ExpenseRow; defaultVendorId?: string }) {
  const router = useRouter()
  const isEdit = Boolean(expense)
  const { data: categories = [] } = useCategories()
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const pending = createExpense.isPending || updateExpense.isPending

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: expense?.date ?? today(),
      description: expense?.description ?? '',
      amount: expense?.amount ?? undefined,
      category_id: expense?.category_id ?? '',
      subcategory_id: expense?.subcategory_id ?? null,
      vendor_id: expense?.vendor_id ?? defaultVendorId ?? null,
      challan_no: expense?.challan_no ?? '',
      due_date: expense?.due_date ?? null,
    },
  })

  const categoryId = watch('category_id')
  const { data: subcategories = [] } = useSubcategories(categoryId || null)

  const backHref = isEdit && expense ? `/expenses/${expense.id}` : '/expenses'

  const onSubmit = handleSubmit(async (input) => {
    try {
      if (isEdit && expense) {
        await updateExpense.mutateAsync({ id: expense.id, ...input })
        toast.success('Expense updated')
        router.push(`/expenses/${expense.id}`)
      } else {
        const created = await createExpense.mutateAsync(input)
        toast.success('Expense saved')
        router.push(`/expenses/${created.id}`)
      }
    } catch (error) {
      reportError(
        error,
        friendlyMessage(error, isEdit ? 'Could not update expense. Try again.' : 'Could not save expense. Try again.')
      )
    }
  })

  const hasErrors = Object.keys(errors).length > 0

  return (
    <form className="crud-page" onSubmit={onSubmit}>
      <div className="crud-page-header">
        <Link className="icon-button" href={backHref} aria-label="Back">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <p className="eyebrow">Expenses</p>
          <h1>{isEdit ? 'Edit expense' : 'Add a new expense'}</h1>
          <p>Capture the bill and vendor in one place.</p>
        </div>
        <Link className="icon-button close-button" href={backHref} aria-label="Close">
          <X size={21} />
        </Link>
      </div>

      <div className="crud-workspace">
        <section className="form-card">
          <div className="form-section-heading">
            <span>01</span>
            <div>
              <h2>Expense details</h2>
              <p>Basic information shown in the ledger.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field amount-field">
              <span>Amount</span>
              <div className="input-with-icon">
                <IndianRupee size={21} />
                <input inputMode="decimal" placeholder="0" {...register('amount', { valueAsNumber: true })} />
              </div>
              {errors.amount ? (
                <small className="field-error">{errors.amount.message}</small>
              ) : (
                <small>Enter the total bill amount</small>
              )}
            </label>
            <label className="field">
              <span>Date</span>
              <div className="input-with-icon">
                <Calendar size={17} />
                <input type="date" {...register('date')} />
              </div>
              {errors.date && <small className="field-error">{errors.date.message}</small>}
            </label>
            <label className="field field-wide">
              <span>Description</span>
              <input placeholder="What was this expense for?" {...register('description')} />
              {errors.description && <small className="field-error">{errors.description.message}</small>}
            </label>
            <label className="field">
              <span>Category</span>
              <select {...register('category_id', { onChange: () => setValue('subcategory_id', null) })}>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && <small className="field-error">Pick a category</small>}
            </label>
            <label className="field">
              <span>
                Subcategory <em>Optional</em>
              </span>
              <select disabled={!categoryId} {...register('subcategory_id', { setValueAs: (v) => v || null })}>
                <option value="">{categoryId ? 'Select subcategory' : 'Select category first'}</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="field field-wide">
              <span>
                Vendor <em>Optional</em>
              </span>
              <Controller
                control={control}
                name="vendor_id"
                render={({ field }) => (
                  <VendorCombobox
                    value={field.value ?? null}
                    onSelect={(vendor) => field.onChange(vendor?.id ?? null)}
                    initialLabel={expense?.vendors?.name}
                  />
                )}
              />
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="form-section-heading">
            <span>02</span>
            <div>
              <h2>Reference</h2>
              <p>Optional challan number and due date.</p>
            </div>
          </div>
          <div className="form-grid payment-fields">
            <label className="field">
              <span>
                Challan number <em>Optional</em>
              </span>
              <input placeholder="e.g. CH-1042" {...register('challan_no')} />
            </label>
            <label className="field">
              <span>
                Due date <em>Optional</em>
              </span>
              <div className="input-with-icon">
                <Calendar size={17} />
                <input type="date" {...register('due_date', { setValueAs: (v) => v || null })} />
              </div>
            </label>
          </div>
        </section>
      </div>

      <div className="crud-footer">
        <p>
          {hasErrors
            ? 'Check the highlighted fields.'
            : 'A new expense starts unpaid — record a payment afterward.'}
        </p>
        <div>
          <Link className="secondary-button" href={backHref}>
            Cancel
          </Link>
          <button className="primary-button" type="submit" disabled={pending}>
            <Save size={17} /> {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Save expense'}
          </button>
        </div>
      </div>
    </form>
  )
}
