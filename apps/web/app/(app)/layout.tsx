import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { SessionProvider } from '@/lib/auth/session-context'
import { AppShell } from '@/components/shared/app-shell'

/**
 * Every route under (app) is signed-in only. `proxy.ts` already redirects
 * anonymous traffic; this is the second layer, and it resolves the session
 * once so no child has to.
 *
 * The session is cached per request, so pages below can call getSession()
 * again for free.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  // A user with no site membership cannot do anything useful. The Owner
  // assigns membership in Settings → Team.
  if (!session) {
    return (
      <main className="product-page state-page">
        <div className="system-state">
          <p className="eyebrow">No site yet</p>
          <h1>You are not on a site yet</h1>
          <p>
            Ask the owner to add you to a site, then sign in again. If you have just
            been added, sign out and back in to pick up the change.
          </p>
          <Link className="primary-button" href="/login">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <SessionProvider session={session}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  )
}
