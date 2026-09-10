'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronDown,
  Clock3,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { ROLE_LABEL, ROLES, capabilitiesFor, formatDate, type Role } from '@sitekhata/shared'
import {
  useTeam,
  useChangeRole,
  useRemoveMember,
  useInviteMember,
  useRenewInvitation,
  useRevokeInvitation,
} from '@/lib/hooks/use-team'
import { useSession } from '@/lib/auth/session-context'
import { friendlyMessage, reportError } from '@/lib/errors'

function InviteForm({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Exclude<Role, 'owner'>>('member')
  const invite = useInviteMember()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      const result = await invite.mutateAsync({ phone: phone.trim(), role })
      toast.success(
        result.kind === 'member'
          ? `${result.name} added as ${ROLE_LABEL[result.role]}`
          : 'Invitation created. It will be claimed after their first sign-in.'
      )
      onDone()
    } catch (error) {
      reportError(error, error instanceof Error ? error.message : 'Could not add that member.')
    }
  }

  return (
    <form className="inline-create invite-form" onSubmit={submit}>
      <label>
        <span>Phone number</span>
        <input
          autoFocus
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+91 98765 43210"
          inputMode="tel"
        />
      </label>
      <label>
        <span>Role</span>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as Exclude<Role, 'owner'>)}
        >
          {ROLES.filter((r) => r !== 'owner').map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="secondary-button" onClick={onDone}>
        Cancel
      </button>
      <button
        className="primary-button"
        type="submit"
        disabled={invite.isPending || phone.trim().length < 7}
      >
        {invite.isPending ? 'Inviting…' : 'Invite member'}
      </button>
    </form>
  )
}

export function TeamManage() {
  const { data, isLoading, isError, refetch } = useTeam()
  const members = data?.members ?? []
  const invitations = data?.invitations ?? []
  const invitationsAvailable = data?.invitationsAvailable ?? true
  const changeRole = useChangeRole()
  const removeMember = useRemoveMember()
  const renewInvitation = useRenewInvitation()
  const revokeInvitation = useRevokeInvitation()
  const session = useSession()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')

  const filteredMembers = members.filter((member) => {
    const matchesQuery = `${member.name} ${member.phone ?? ''}`
      .toLowerCase()
      .includes(query.toLowerCase())
    return matchesQuery && (roleFilter === 'all' || member.role === roleFilter)
  })

  async function handleRoleChange(userId: string, role: Role) {
    try {
      await changeRole.mutateAsync({ userId, role })
      toast.success('Role updated')
    } catch (error) {
      reportError(error, friendlyMessage(error, 'Could not update role.'))
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (
      !window.confirm(
        `Remove ${name} from this site? They will immediately lose access to its records.`
      )
    )
      return
    try {
      await removeMember.mutateAsync(userId)
      toast.success(`${name} removed from the site`)
    } catch (error) {
      reportError(error, friendlyMessage(error, 'Could not remove that member.'))
    }
  }

  async function handleRenew(invitationId: string) {
    try {
      await renewInvitation.mutateAsync(invitationId)
      toast.success('Invitation renewed for 7 days')
    } catch (error) {
      reportError(error, friendlyMessage(error, 'Could not renew the invitation.'))
    }
  }

  async function handleRevoke(invitationId: string) {
    if (!window.confirm('Revoke this invitation? It will no longer be claimed at sign-in.')) return
    try {
      await revokeInvitation.mutateAsync(invitationId)
      toast.success('Invitation revoked')
    } catch (error) {
      reportError(error, friendlyMessage(error, 'Could not revoke the invitation.'))
    }
  }

  return (
    <div className="product-page">
      <header className="product-header">
        <div>
          <p className="eyebrow">Access</p>
          <h1>Team</h1>
          <p>Manage who can view, record and approve site expenses.</p>
        </div>
        <div className="heading-actions">
          <button
            className="primary-button"
            onClick={() => setInviteOpen(true)}
            disabled={inviteOpen}
          >
            <UserPlus size={17} /> Invite member
          </button>
        </div>
      </header>

      {inviteOpen && <InviteForm onDone={() => setInviteOpen(false)} />}

      {!isLoading && !invitationsAvailable && (
        <div className="inline-confirm team-setup-note">
          <Clock3 size={18} />
          <div>
            <strong>Pending invitations need a database update</strong>
            <p>
              You can still add anyone who has already signed in once. Apply the team invitations
              migration to invite brand-new users.
            </p>
          </div>
        </div>
      )}

      <section className="mini-stat-grid team-stats">
        <article className="mini-stat">
          <span>
            <Users size={18} />
          </span>
          <div>
            <p>Active members</p>
            <strong>{members.filter((m) => m.active).length}</strong>
            <small>{members.length} total accounts</small>
          </div>
        </article>
        <article className="mini-stat">
          <span>
            <Clock3 size={18} />
          </span>
          <div>
            <p>Pending invitations</p>
            <strong>{invitations.length}</strong>
            <small>Automatically expire after 7 days</small>
          </div>
        </article>
        <article className="mini-stat">
          <span>
            <ShieldCheck size={18} />
          </span>
          <div>
            <p>Owners & admins</p>
            <strong>
              {members.filter((m) => m.role === 'owner' || m.role === 'admin').length}
            </strong>
            <small>Can manage financial actions</small>
          </div>
        </article>
      </section>

      <section className="panel product-list-panel">
        <div className="list-toolbar team-toolbar">
          <label className="product-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or phone"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </label>
          <select
            className="role-select"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as 'all' | Role)}
          >
            <option value="all">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
        </div>
        {isLoading ? (
          <p className="list-loading">Loading team…</p>
        ) : isError ? (
          <div className="team-error">
            <p>We couldn’t load the team.</p>
            <button className="secondary-button small" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : (
          <div className="team-table">
            <div className="team-head">
              <span>Member</span>
              <span>Role</span>
              <span>Joined</span>
              <span>Status</span>
              <span />
            </div>
            {filteredMembers.map((member) => {
              const initials = member.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join('')
              const isSelf = member.userId === session.userId
              return (
                <div className="team-row" key={member.userId}>
                  <span className="primary-cell">
                    <i>{initials || '·'}</i>
                    <span>
                      <strong>{member.name}</strong>
                      <small>{member.phone ?? 'No phone on file'}</small>
                    </span>
                  </span>
                  <span>
                    {isSelf ? (
                      <span className="role-select">{ROLE_LABEL[member.role]}</span>
                    ) : (
                      <select
                        className="role-select"
                        value={member.role}
                        disabled={changeRole.isPending}
                        onChange={(event) =>
                          handleRoleChange(member.userId, event.target.value as Role)
                        }
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </select>
                    )}
                  </span>
                  <span>{formatDate(member.joinedAt)}</span>
                  <span className="member-status">
                    <i /> {member.active ? 'Active' : 'Inactive'}
                  </span>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        className="icon-button"
                        aria-label={`Actions for ${member.name}`}
                        disabled={isSelf}
                      >
                        <MoreHorizontal size={17} />
                      </button>
                    </DropdownMenu.Trigger>
                    {!isSelf && (
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="trend-range-menu"
                          align="end"
                          sideOffset={6}
                        >
                          <DropdownMenu.Item
                            className="trend-range-option"
                            onSelect={() => handleRemove(member.userId, member.name)}
                          >
                            Remove from site
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    )}
                  </DropdownMenu.Root>
                </div>
              )
            })}
            {filteredMembers.length === 0 && (
              <p className="category-admin-empty">
                {members.length ? 'No members match those filters.' : 'No team members yet.'}
              </p>
            )}
          </div>
        )}
      </section>

      {invitations.length > 0 && (
        <section className="panel pending-panel">
          <div className="panel-heading">
            <div>
              <h2>Pending invitations</h2>
              <p>
                Access is added automatically when the person first signs in with this phone number.
              </p>
            </div>
          </div>
          <div className="pending-list">
            {invitations.map((invitation) => (
              <div key={invitation.id}>
                <span className="pending-avatar">
                  <Clock3 size={15} />
                </span>
                <span>
                  <strong>+{invitation.phone}</strong>
                  <small>Expires {formatDate(invitation.expires_at)}</small>
                </span>
                <span className="role-select">{ROLE_LABEL[invitation.role]}</span>
                <button
                  className="secondary-button small"
                  disabled={renewInvitation.isPending}
                  onClick={() => handleRenew(invitation.id)}
                >
                  Renew
                </button>
                <button
                  className="icon-button danger-text"
                  disabled={revokeInvitation.isPending}
                  onClick={() => handleRevoke(invitation.id)}
                  aria-label={`Revoke invitation for ${invitation.phone}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="permission-panel panel">
        <div>
          <ShieldCheck size={21} />
          <span>
            <h2>Role permissions</h2>
            <p>
              Owners manage everything. Admins manage expenses and payments. Members can record
              entries. Viewers are read-only.
            </p>
          </span>
        </div>
        <button className="secondary-button" onClick={() => setMatrixOpen(!matrixOpen)}>
          {matrixOpen ? 'Hide' : 'View'} permission matrix <ChevronDown size={15} />
        </button>
      </section>

      {matrixOpen && (
        <section className="panel product-list-panel">
          <div className="flex flex-col gap-3">
            {ROLES.map((role) => (
              <div
                key={role}
                className="border-t border-neutral-100 pt-3 first:border-t-0 first:pt-0"
              >
                <strong className="text-xs font-semibold text-neutral-800">
                  {ROLE_LABEL[role]}
                </strong>
                <p className="mt-1 text-xs text-neutral-500">{capabilitiesFor(role).join(', ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
