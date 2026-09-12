'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, KeyRound, MapPin, ShieldCheck } from 'lucide-react'
import { formatDate } from '@gok-net/shared'
import { useSession } from '@/lib/auth/session-context'
import { createClient } from '@/lib/supabase/client'
import { friendlyMessage, reportError, unwrap } from '@/lib/errors'
import { useSites, useCreateSite } from '@/lib/hooks/use-sites'
import { queryKeys } from '@/lib/hooks/keys'
import { PinDialog } from '@/components/shared/pin-dialog'
import { Modal } from '@/components/shared/modal'
import { ActivePill } from '@/components/shared/status-badge'

/**
 * Owner-only (gated in settings/layout.tsx via requireCapability('manageSites')).
 *
 * Notifications and Exports are deliberately not sections here — notification
 * preferences moved to the header bell (see components/shared/notifications-bell.tsx),
 * and a workspace-wide export was never a real feature; Dashboard/Payments
 * already have contextual export/print actions where the data lives.
 */
export function SettingsManage() {
  const session = useSession()

  return (
    <div className="product-page settings-page">
      <header className="product-header">
        <div>
          <p className="eyebrow">Preferences</p>
          <h1>Settings</h1>
          <p>Configure {session.siteName} and manage every site Gokulesh Group runs.</p>
        </div>
      </header>
      <div className="settings-layout">
        <div className="settings-content">
          <SiteProfileSection />
          <SitesSection />
          <ActionPinSection />
          <DangerZoneSection />
        </div>
      </div>
    </div>
  )
}

function SiteProfileSection() {
  const session = useSession()
  const [name, setName] = useState(session.siteName)
  const [address, setAddress] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    createClient()
      .from('sites')
      .select('name, address, slug')
      .eq('id', session.siteId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return
        setName(data.name)
        setAddress(data.address ?? '')
        setSlug(data.slug)
      })
    return () => {
      cancelled = true
    }
  }, [session.siteId])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) {
      toast.error('Site name needs at least 2 characters.')
      return
    }
    setSaving(true)
    const { error } = await createClient()
      .from('sites')
      .update({ name: name.trim(), address: address.trim() || null })
      .eq('id', session.siteId)
    setSaving(false)
    if (error) {
      reportError(error, friendlyMessage(error, 'Could not save the site profile.'))
      return
    }
    setSaved(true)
    toast.success('Site profile saved')
    window.setTimeout(() => setSaved(false), 2200)
  }

  return (
    <form className="panel settings-section" id="site" onSubmit={save}>
      <div>
        <h2>Site profile</h2>
        <p>Information shown across reports and exports.</p>
      </div>
      <div className="settings-fields">
        <label>
          <span>Site name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>Site code</span>
          <input value={slug} disabled />
        </label>
        <label className="wide">
          <span>Site address</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Andheri East, Mumbai, Maharashtra" />
        </label>
      </div>
      <div className="settings-save">
        <span>{saved && (<><CheckCircle2 size={15} /> Saved</>)}</span>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function SitesSection() {
  const { data: sites = [], isLoading } = useSites()
  const createSite = useCreateSite()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    try {
      await createSite.mutateAsync({ name: name.trim(), address: address.trim() || null })
      toast.success(`${name.trim()} added. Switch to it from the sidebar.`)
      setName('')
      setAddress('')
      setAdding(false)
    } catch (error) {
      reportError(error, error instanceof Error ? error.message : 'Could not add that site.')
    }
  }

  return (
    <section className="panel settings-section" id="sites">
      <div>
        <h2>Sites</h2>
        <p>Every construction site you own. Switch between them from the sidebar.</p>
      </div>

      {adding ? (
        <form className="inline-create" onSubmit={submit}>
          <label>
            <span>Site name</span>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Gokulesh Meadows" />
          </label>
          <label>
            <span>Address</span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Optional" />
          </label>
          <button type="button" className="secondary-button" onClick={() => setAdding(false)}>
            Cancel
          </button>
          <button className="primary-button" type="submit" disabled={createSite.isPending || name.trim().length < 2}>
            {createSite.isPending ? 'Adding…' : 'Add site'}
          </button>
        </form>
      ) : (
        <button className="secondary-button mt-4" type="button" onClick={() => setAdding(true)}>
          <MapPin size={15} /> Add another site
        </button>
      )}

      {isLoading ? (
        <p className="list-loading">Loading sites…</p>
      ) : (
        <div className="compact-list mt-4">
          {sites.map((site) => (
            <div key={site.id}>
              <span>
                <strong>{site.name}</strong>
                <small>{site.address || 'No address on file'}</small>
              </span>
              <ActivePill active={!site.archived_at} inactiveLabel="Archived" />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ActionPinSection() {
  const session = useSession()
  const supabase = createClient()

  // Source of truth for "is a PIN set" is `sites.settings.pin_hash` itself,
  // fetched via /api/pin (service role — RLS keeps pin_hash out of reach of
  // the browser client). audit_log is only ever a record of *changes made
  // through this form*, so a PIN set another way (the seed script, a support
  // fix) leaves no audit_log row — using audit_log as the presence check
  // showed "No PIN set yet" for sites that had one, and then rendered the
  // "first PIN" form (no current-PIN field) while the server still correctly
  // demanded the current PIN.
  const { data: pinStatus, isLoading: statusLoading } = useQuery({
    queryKey: queryKeys.pinStatus(session.siteId),
    queryFn: async (): Promise<{ hasPin: boolean }> => {
      const response = await fetch('/api/pin')
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Could not check the action PIN.')
      return body.data
    },
  })

  const { data: pinHistory, isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.pinHistory(session.siteId),
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from('audit_log')
          .select('action, created_at')
          .eq('site_id', session.siteId)
          .in('action', ['pin_set', 'pin_changed'])
          .order('created_at', { ascending: false })
          .limit(1)
      ) as Array<{ action: string; created_at: string }>
      return rows[0] ?? null
    },
  })

  const isLoading = statusLoading || historyLoading
  const hasPin = Boolean(pinStatus?.hasPin)
  const [open, setOpen] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const queryClient = useQueryClient()

  function closeModal() {
    setOpen(false)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (newPin.length !== 6) {
      toast.error('The new PIN is 6 digits.')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('The new PIN and confirmation do not match.')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPin, currentPin: hasPin ? currentPin : undefined }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Could not save the PIN.')
      toast.success(hasPin ? 'PIN changed' : 'PIN set')
      closeModal()
      queryClient.invalidateQueries({ queryKey: queryKeys.pinStatus(session.siteId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.pinHistory(session.siteId) })
    } catch (error) {
      reportError(error, error instanceof Error ? error.message : 'Could not save the PIN.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel settings-section" id="security">
      <div>
        <h2>Action PIN</h2>
        <p>Required before recording sensitive payment, void or archive actions.</p>
      </div>
      <div className="security-box">
        <ShieldCheck size={20} />
        <span>
          <strong>{isLoading ? 'Checking…' : hasPin ? '6-digit PIN is active' : 'No PIN set yet'}</strong>
          <small>
            {isLoading
              ? 'Looking up the action PIN for this site.'
              : hasPin && pinHistory
                ? `Last changed ${formatDate(pinHistory.created_at)}`
                : hasPin
                  ? 'Required before payments or void actions can be recorded.'
                  : 'Set one before payments or void actions can be recorded.'}
          </small>
        </span>
        <button className="secondary-button" type="button" disabled={isLoading} onClick={() => setOpen(true)}>
          <KeyRound size={15} /> {isLoading ? '…' : hasPin ? 'Change PIN' : 'Set PIN'}
        </button>
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        title={hasPin ? 'Change action PIN' : 'Set an action PIN'}
        description={
          hasPin
            ? 'Enter your current PIN, then the new one, to change it.'
            : 'This PIN will be required before payments, voids or an archive can be recorded.'
        }
      >
        <form onSubmit={submit} className="flex flex-col gap-3">
          {hasPin && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Current PIN</span>
              <input
                autoFocus
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm tabular-nums"
                placeholder="······"
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">New PIN</span>
            <input
              autoFocus={!hasPin}
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={newPin}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm tabular-nums"
              placeholder="······"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Confirm new PIN</span>
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm tabular-nums"
              placeholder="······"
            />
          </label>

          <div className="mt-2 flex gap-3">
            <button type="button" onClick={closeModal} className="secondary-button flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="primary-button flex-1">
              {submitting ? 'Saving…' : 'Save PIN'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

function DangerZoneSection() {
  const session = useSession()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)

  return (
    <section className="panel settings-section danger-zone" id="danger">
      <div>
        <h2>Archive site</h2>
        <p>Hide {session.siteName} from everyday use while preserving its complete records.</p>
      </div>
      {!confirmOpen ? (
        <button className="secondary-button danger-text" onClick={() => setConfirmOpen(true)}>
          Archive {session.siteName}
        </button>
      ) : (
        <div className="inline-confirm danger">
          <AlertCircle size={20} />
          <div>
            <strong>Archive this site?</strong>
            <p>Its records stay intact but it drops out of the sidebar switcher for everyone. This needs the action PIN.</p>
          </div>
          <button className="secondary-button" onClick={() => setConfirmOpen(false)}>
            Keep
          </button>
          <button className="danger-button" onClick={() => setPinOpen(true)}>
            Continue
          </button>
        </div>
      )}
      <PinDialog
        action="archive_site"
        payload={{ site_id: session.siteId }}
        open={pinOpen}
        onOpenChange={setPinOpen}
        onSuccess={() => {
          setConfirmOpen(false)
          toast.success(`${session.siteName} archived.`)
          window.location.href = '/dashboard'
        }}
      />
    </section>
  )
}
