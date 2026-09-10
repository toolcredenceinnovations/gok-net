import { requireCapability } from '@/lib/auth/session'

/** Editing an existing vendor is owner/admin only (AUTH.md). */
export default async function EditVendorLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('editVendor')
  return <>{children}</>
}
