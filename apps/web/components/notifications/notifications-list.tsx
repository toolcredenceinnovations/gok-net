'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNowStrict } from 'date-fns'
import { Bell, Check, IndianRupee, ReceiptText } from 'lucide-react'
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type AppNotification,
  type NotificationType,
} from '@/lib/hooks/use-notifications'

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  expense_created: ReceiptText,
  payment_recorded: Check,
  payment_due: IndianRupee,
}

export function NotificationsList() {
  const router = useRouter()
  const [filter, setFilter] = useState<'All' | 'Unread' | 'Read'>('All')
  const { data: notifications = [], isLoading, unreadCount } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const filtered = useMemo(
    () =>
      notifications.filter((n) =>
        filter === 'All' ? true : filter === 'Unread' ? !n.read_at : Boolean(n.read_at)
      ),
    [notifications, filter]
  )

  function handleSelect(notification: AppNotification) {
    if (!notification.read_at) markRead.mutate(notification.id)
    if (notification.entity === 'expenses' && notification.entity_id) {
      router.push(`/expenses/${notification.entity_id}`)
    }
  }

  return (
    <div className="product-page">
      <header className="product-header">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>Notifications</h1>
          <p>Everything from the last 30 days. Older notifications are cleared automatically.</p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary-button"
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            Mark all as read
          </button>
        </div>
      </header>

      <section className="panel product-list-panel">
        <div className="filter-tabs">
          {(['All', 'Unread', 'Read'] as const).map((value) => (
            <button className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)} key={value}>
              {value}
              {value === 'Unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="list-loading">Loading notifications…</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span>
              <Bell size={22} />
            </span>
            <h3>Nothing here</h3>
            <p>
              {filter === 'All'
                ? 'You have no notifications from the last 30 days.'
                : `No ${filter.toLowerCase()} notifications.`}
            </p>
          </div>
        ) : (
          <div className="notif-full-list">
            {filtered.map((notification) => {
              const Icon = TYPE_ICON[notification.type] ?? Bell
              return (
                <button
                  key={notification.id}
                  type="button"
                  className={`notif-full-row ${notification.read_at ? '' : 'is-unread'}`}
                  onClick={() => handleSelect(notification)}
                >
                  <i>
                    <Icon size={16} />
                  </i>
                  <span>
                    <strong>{notification.title}</strong>
                    {notification.body && <small>{notification.body}</small>}
                  </span>
                  <time>
                    {formatDistanceToNowStrict(new Date(notification.created_at), { addSuffix: true })}
                  </time>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
