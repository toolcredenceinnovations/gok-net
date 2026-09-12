'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_LABEL } from '@gok-net/shared'
import { useSession } from '@/lib/auth/session-context'
import { createClient } from '@/lib/supabase/client'

export function UserAccountMenu({ variant = 'sidebar' }: { variant?: 'sidebar' | 'header' }) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const session = useSession()

  const initials = session.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    const { error } = await createClient().auth.signOut({ scope: 'local' })
    if (error) {
      toast.error('Could not log you out. Please try again.')
      setSigningOut(false)
      return
    }
    toast.success('You have been logged out.')
    router.replace('/login')
    router.refresh()
  }

  const isHeader = variant === 'header'

  return (
    <div className={`user-menu-root ${isHeader ? 'user-menu-root-header' : ''}`} ref={rootRef}>
      {open && (
        <div className={`user-menu-popover ${isHeader ? 'user-menu-popover-header' : ''}`} role="menu" aria-label="User menu">
          <div className="user-menu-heading">
            <span className="avatar avatar-large">{initials || '·'}</span>
            <span><strong>{session.name}</strong><small>{session.email ?? session.phone ?? ROLE_LABEL[session.role]}</small></span>
          </div>
          <div className="user-menu-links">
            <Link href="/profile" role="menuitem" onClick={() => setOpen(false)}><UserRound size={18} strokeWidth={1.8} /><span><strong>Personal profile</strong><small>Name, contact and password</small></span></Link>
            <Link href="/settings" role="menuitem" onClick={() => setOpen(false)}><Settings size={18} strokeWidth={1.8} /><span><strong>Workspace settings</strong><small>Site and notification preferences</small></span></Link>
          </div>
          <button type="button" className="user-menu-logout" role="menuitem" onClick={handleSignOut} disabled={signingOut}>
            <LogOut size={18} strokeWidth={1.8} /><span>{signingOut ? 'Logging out…' : 'Log out'}</span>
          </button>
        </div>
      )}
      <button
        type="button"
        className={`user-card ${isHeader ? 'user-card-compact' : ''} ${open ? 'is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={isHeader ? `${session.name} account menu` : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar">{initials || '·'}</span>
        {!isHeader && (
          <>
            <span><strong>{session.name}</strong><small>{ROLE_LABEL[session.role]}</small></span>
            <ChevronDown className="user-menu-chevron" size={16} />
          </>
        )}
      </button>
    </div>
  )
}
