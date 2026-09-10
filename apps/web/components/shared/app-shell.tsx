'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Bell, Building2, ChevronDown, ClipboardList, FileClock, HardHat, HelpCircle, Menu, Plus, Search, Settings, Tags, Users, WalletCards } from 'lucide-react'
import { ROLE_LABEL, can, type Capability } from '@sitekhata/shared'
import { useSession } from '@/lib/auth/session-context'
import { HelpDialog } from '@/components/shared/help-dialog'

/**
 * Nav entries carry the capability that unlocks them, so a member never sees
 * a link to a page the route gate would bounce them off. The gate in each
 * route's layout.tsx is the real enforcement; this just avoids dead ends.
 */
const primaryNav: Array<{ label: string; href: string; icon: typeof BarChart3; capability?: Capability }> = [
  { label: 'Overview', href: '/dashboard', icon: BarChart3, capability: 'viewDashboard' },
  { label: 'Expenses', href: '/expenses', icon: WalletCards },
  { label: 'Vendors', href: '/vendors', icon: Building2 },
  { label: 'Payments', href: '/payments', icon: ClipboardList },
]
const manageNav: Array<{ label: string; href: string; icon: typeof Tags; capability: Capability }> = [
  { label: 'Categories', href: '/categories', icon: Tags, capability: 'manageSubcategories' },
  { label: 'Team', href: '/team', icon: Users, capability: 'manageUsers' },
  { label: 'Audit log', href: '/audit', icon: FileClock, capability: 'viewAuditLog' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [search, setSearch] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const session = useSession()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)
  const allowed = (capability?: Capability) => !capability || can(session.role, capability)

  const visiblePrimary = primaryNav.filter((item) => allowed(item.capability))
  const visibleManage = manageNav.filter((item) => allowed(item.capability))

  const initials = session.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="app-shell">
      {navOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar ${navOpen ? 'is-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><img src="/gokulesh-group-logo.svg" alt="" /></div>
          <div><strong>Gokulesh Group</strong><span>SiteKhata</span></div>
        </div>

        <div className="site-switcher">
          <span className="site-icon"><HardHat size={17} /></span>
          <span><small>Active site</small>Gokulesh Tulip</span>
          {session.memberships.length > 1 && <ChevronDown size={16} />}
        </div>

        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {visiblePrimary.map(({ label, href, icon: Icon }) => (
            <Link className={`nav-item ${isActive(href) ? 'is-active' : ''}`} href={href} key={label} onClick={() => setNavOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </Link>
          ))}
          {visibleManage.length > 0 && (
            <>
              <p className="nav-label nav-label-spaced">Manage</p>
              {visibleManage.map(({ label, href, icon: Icon }) => (
                <Link className={`nav-item ${isActive(href) ? 'is-active' : ''}`} href={href} key={label} onClick={() => setNavOpen(false)}>
                  <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-item w-full appearance-none border-none bg-transparent text-left font-[inherit] cursor-pointer"
            onClick={() => setHelpOpen(true)}
          >
            <HelpCircle size={18} />Help &amp; support
          </button>
          <Link className={`nav-item ${isActive('/settings') ? 'is-active' : ''}`} href="/settings"><Settings size={18} />Settings</Link>
          <div className="user-card">
            <span className="avatar">{initials || '·'}</span>
            <span><strong>{session.name}</strong><small>{ROLE_LABEL[session.role]}</small></span>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      <section className="app-stage">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
          <form
            className="search-box"
            onSubmit={(event) => {
              event.preventDefault()
              if (search.trim()) router.push(`/expenses?q=${encodeURIComponent(search.trim())}`)
            }}
          >
            <Search size={18} />
            <input aria-label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search expenses, vendors or challans" />
            <kbd>⌘ K</kbd>
          </form>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
            {can(session.role, 'createExpense') && (
              <Link className="primary-button compact" href="/expenses/new"><Plus size={17} /> Add expense</Link>
            )}
          </div>
        </header>
        <main className="work-area">{children}</main>
      </section>

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
