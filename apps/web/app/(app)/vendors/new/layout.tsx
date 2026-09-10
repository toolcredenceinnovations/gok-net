import { requireCapability } from '@/lib/auth/session'

/** Owner, admin and member can add a vendor (AUTH.md). */
export default async function NewVendorLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('createVendor')
  return <>{children}</>
}
