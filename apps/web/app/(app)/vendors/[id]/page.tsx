import { VendorDetail } from '@/components/vendors/vendor-detail'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <VendorDetail id={id} />
}
