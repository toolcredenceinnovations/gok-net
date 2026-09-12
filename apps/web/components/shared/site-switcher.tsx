'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { toast } from 'sonner'
import { ChevronDown, HardHat } from 'lucide-react'
import { useSession } from '@/lib/auth/session-context'
import { createClient } from '@/lib/supabase/client'

/**
 * Switching sites updates `active_site_id` directly — the "update own
 * profile" RLS policy already permits this, constrained to sites the user
 * actually belongs to (`user_belongs_to_site`), so no API route is needed.
 * `getSession()` is wrapped in React's `cache()`, which only dedupes within
 * one render pass, so a fresh navigation (not just `router.refresh()`) picks
 * up the new active site cleanly.
 */
export function SiteSwitcher() {
  const session = useSession()
  const router = useRouter()
  const [switching, setSwitching] = useState(false)

  async function switchSite(siteId: string) {
    if (siteId === session.siteId || switching) return
    setSwitching(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({ active_site_id: siteId })
      .eq('id', session.userId)
    if (error) {
      toast.error('Could not switch sites. Try again.')
      setSwitching(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  if (session.memberships.length <= 1) {
    return (
      <div className="site-switcher">
        <span className="site-icon">
          <HardHat size={17} />
        </span>
        <span>
          <small>Active site</small>
          {session.siteName}
        </span>
      </div>
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="site-switcher w-full appearance-none text-left font-[inherit] cursor-pointer"
          type="button"
          disabled={switching}
        >
          <span className="site-icon">
            <HardHat size={17} />
          </span>
          <span>
            <small>Active site</small>
            {session.siteName}
          </span>
          <ChevronDown size={16} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="trend-range-menu" align="start" sideOffset={6}>
          {session.memberships.map((membership) => (
            <DropdownMenu.Item
              className="trend-range-option"
              key={membership.siteId}
              onSelect={() => switchSite(membership.siteId)}
            >
              <DropdownMenu.ItemIndicator className="trend-range-check" forceMount>
                {membership.siteId === session.siteId ? '✓' : ''}
              </DropdownMenu.ItemIndicator>
              {membership.siteName}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
