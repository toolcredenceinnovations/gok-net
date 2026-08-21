import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Every route under (app) is signed-in only. The middleware already redirects
 * anonymous traffic; this is the second layer, and it also resolves the
 * active site so children don't each have to.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, name, active_site_id')
    .eq('id', user.id)
    .single()

  // A user with no site yet cannot do anything useful. The Owner assigns
  // membership in Settings → Users.
  if (!profile?.active_site_id) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-lg font-semibold">You are not on a site yet</h1>
          <p className="mt-2 text-neutral-600">
            Ask the owner to add you, then sign in again.
          </p>
        </div>
      </main>
    )
  }

  return <div className="min-h-dvh">{children}</div>
}
