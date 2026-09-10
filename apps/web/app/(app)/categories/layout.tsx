import { requireCapability } from '@/lib/auth/session'

/** Subcategory management is Owner only (AUTH.md). */
export default async function CategoriesLayout({ children }: { children: React.ReactNode }) {
  await requireCapability('manageSubcategories')
  return <>{children}</>
}
