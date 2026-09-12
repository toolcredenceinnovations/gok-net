'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as Popover from '@radix-ui/react-popover'
import { formatDistanceToNowStrict } from 'date-fns'
import { Bell } from 'lucide-react'
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type AppNotification,
} from '@/lib/hooks/use-notifications'

const PREVIEW_COUNT = 8

export function NotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { data: notifications = [], isLoading, unreadCount } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  function handleSelect(notification: AppNotification) {
    setOpen(false)
    if (!notification.read_at) markRead.mutate(notification.id)
    if (notification.entity === 'expenses' && notification.entity_id) {
      router.push(`/expenses/${notification.entity_id}`)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="icon-button notif-trigger"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell size={19} />
          {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="notif-panel" align="end" sideOffset={10}>
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button
                className="plain-link"
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="notif-panel-list">
            {isLoading ? (
              <p className="list-loading">Loading…</p>
            ) : notifications.length === 0 ? (
              <p className="notif-empty">You&rsquo;re all caught up.</p>
            ) : (
              notifications.slice(0, PREVIEW_COUNT).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`notif-row ${notification.read_at ? '' : 'is-unread'}`}
                  onClick={() => handleSelect(notification)}
                >
                  <i />
                  <span>
                    <strong>{notification.title}</strong>
                    {notification.body && <small>{notification.body}</small>}
                    <time>
                      {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
                    </time>
                  </span>
                </button>
              ))
            )}
          </div>
          <Link className="notif-panel-foot" href="/notifications" onClick={() => setOpen(false)}>
            See all notifications
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
