'use client'

import { useVendor } from '@/lib/hooks/use-vendors'
import { VendorForm } from './vendor-form'

export function VendorEdit({ id }: { id: string }) {
  const { data: vendor, isLoading } = useVendor(id)

  if (isLoading) return <p className="list-loading">Loading vendor…</p>
  if (!vendor) return <p className="list-loading">Vendor not found.</p>

  return <VendorForm vendor={vendor} />
}
