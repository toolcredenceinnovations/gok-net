'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Building2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { vendorSchema, type VendorInput } from '@gok-net/shared'
import { useCreateVendor, useUpdateVendor, type Vendor } from '@/lib/hooks/use-vendors'
import { friendlyMessage, reportError } from '@/lib/errors'

/** Shared by /vendors/new and /vendors/[id]/edit — same fields either way. */
export function VendorForm({ vendor }: { vendor?: Vendor }) {
  const router = useRouter()
  const isEdit = Boolean(vendor)
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const pending = createVendor.isPending || updateVendor.isPending

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: vendor?.name ?? '',
      phone: vendor?.phone ?? '',
      gstin: vendor?.gstin ?? '',
      notes: vendor?.notes ?? '',
    },
  })

  const backHref = isEdit && vendor ? `/vendors/${vendor.id}` : '/vendors'

  const onSubmit = handleSubmit(async (input) => {
    try {
      if (isEdit && vendor) {
        const updated = await updateVendor.mutateAsync({ id: vendor.id, ...input })
        toast.success('Vendor updated')
        router.push(`/vendors/${updated.id}`)
      } else {
        const created = await createVendor.mutateAsync(input)
        toast.success('Vendor added')
        router.push(`/vendors/${created.id}`)
      }
    } catch (error) {
      reportError(
        error,
        friendlyMessage(error, isEdit ? 'Could not update vendor. Try again.' : 'Could not add vendor. Try again.')
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
          <p className="eyebrow">Vendors</p>
          <h1>{isEdit ? 'Edit vendor' : 'Add a new vendor'}</h1>
          <p>
            {isEdit
              ? 'Update contact and billing details.'
              : 'Save a supplier or contractor so it is ready to bill against.'}
          </p>
        </div>
        <Link className="icon-button close-button" href={backHref} aria-label="Close">
          <X size={21} />
        </Link>
      </div>

      <div className="crud-workspace">
        <section className="form-card">
          <div className="form-section-heading">
            <span>
              <Building2 size={15} />
            </span>
            <div>
              <h2>Vendor details</h2>
              <p>Shown across expenses and the vendor directory.</p>
            </div>
          </div>
          <div className="form-grid">
            <label className="field field-wide">
              <span>Vendor name</span>
              <input placeholder="e.g. Shree Balaji Cement" {...register('name')} />
              {errors.name && <small className="field-error">{errors.name.message}</small>}
            </label>
            <label className="field">
              <span>
                Phone <em>Optional</em>
              </span>
              <input placeholder="+91 98xxxxxxx" {...register('phone')} />
              {errors.phone && <small className="field-error">{errors.phone.message}</small>}
            </label>
            <label className="field">
              <span>
                GSTIN <em>Optional</em>
              </span>
              <input
                placeholder="27AAHCS8831Q1Z6"
                style={{ textTransform: 'uppercase' }}
                {...register('gstin')}
              />
              {errors.gstin && <small className="field-error">{errors.gstin.message}</small>}
            </label>
            <label className="field field-wide">
              <span>
                Notes <em>Optional</em>
              </span>
              <input placeholder="Delivery preferences, contact person…" {...register('notes')} />
            </label>
          </div>
        </section>
      </div>

      <div className="crud-footer">
        <p>{hasErrors ? 'Check the highlighted fields.' : 'Fields marked required must be completed before saving.'}</p>
        <div>
          <Link className="secondary-button" href={backHref}>
            Cancel
          </Link>
          <button className="primary-button" type="submit" disabled={pending}>
            <Save size={17} /> {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Add vendor'}
          </button>
        </div>
      </div>
    </form>
  )
}
