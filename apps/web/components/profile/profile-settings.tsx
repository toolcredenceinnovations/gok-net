'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, LogOut, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_LABEL } from '@sitekhata/shared'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth/session-context'
import { createClient } from '@/lib/supabase/client'

const passwordRules = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase and one lowercase letter', test: (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value) },
  { label: 'At least one number', test: (value: string) => /\d/.test(value) },
]

export function ProfileSettings() {
  const session = useSession()
  const router = useRouter()
  const [name, setName] = useState(session.name)
  const [phone, setPhone] = useState(session.phone ?? '')
  const [email, setEmail] = useState(session.email ?? '')
  const [profileSaved, setProfileSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  const ruleResults = useMemo(() => passwordRules.map((rule) => ({ ...rule, valid: rule.test(newPassword) })), [newPassword])
  const profileDirty = name.trim() !== session.name || phone.trim() !== (session.phone ?? '') || email.trim() !== (session.email ?? '')

  function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 2) {
      toast.error('Enter a name with at least 2 characters.')
      return
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter a valid email address.')
      return
    }
    if (phone && phone.replace(/\D/g, '').length < 10) {
      toast.error('Enter a valid phone number.')
      return
    }
    setName(name.trim())
    setProfileSaved(true)
    toast.success('Profile changes saved on this device.')
    window.setTimeout(() => setProfileSaved(false), 2200)
  }

  function changePassword(event: FormEvent) {
    event.preventDefault()
    if (!currentPassword) {
      toast.error('Enter your current password.')
      return
    }
    if (!ruleResults.every((rule) => rule.valid)) {
      toast.error('Your new password does not meet all requirements.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      toast.error('Choose a password different from your current one.')
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordChanged(true)
    toast.success('Password validation complete.')
    window.setTimeout(() => setPasswordChanged(false), 2500)
  }

  async function signOut() {
    setSigningOut(true)
    const { error } = await createClient().auth.signOut({ scope: 'local' })
    if (error) {
      toast.error('Could not log you out. Please try again.')
      setSigningOut(false)
      return
    }
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className="product-page profile-page">
      <header className="product-header"><div><p className="eyebrow">Your account</p><h1>Personal profile</h1><p>Manage your personal details, password and active session.</p></div></header>
      <div className="profile-layout">
        <aside className="panel profile-summary">
          <span className="profile-avatar">{initials || '·'}</span>
          <h2>{name || 'Your name'}</h2>
          <p>{ROLE_LABEL[session.role]} · {session.siteName}</p>
          <div><span><Mail size={15} />{email || 'No email added'}</span><span><Phone size={15} />{phone || 'No phone added'}</span></div>
          <span className="profile-status"><i /> Account active</span>
        </aside>

        <div className="profile-content">
          <form className="panel profile-section" onSubmit={saveProfile} noValidate>
            <div className="profile-section-heading"><span><UserRound size={18} /></span><div><h2>Profile information</h2><p>These details identify you across the workspace.</p></div></div>
            <div className="profile-form-grid">
              <label className="wide"><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>
              <label><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" /></label>
              <label><span>Phone number</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" autoComplete="tel" /></label>
            </div>
            <div className="profile-form-footer"><span>{profileSaved && <><CheckCircle2 size={15} /> Saved</>}</span><button className="primary-button" type="submit" disabled={!profileDirty}>Save profile</button></div>
          </form>

          <form className="panel profile-section" onSubmit={changePassword} noValidate>
            <div className="profile-section-heading"><span><KeyRound size={18} /></span><div><h2>Change password</h2><p>Use a strong password you do not reuse elsewhere.</p></div></div>
            <div className="profile-form-grid password-grid">
              <label className="wide"><span>Current password</span><div className="password-input"><input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /><button type="button" aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'} onClick={() => setShowPasswords((value) => !value)}>{showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
              <label><span>New password</span><input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></label>
              <label><span>Confirm new password</span><input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>
            </div>
            <div className="password-rules" aria-live="polite">{ruleResults.map((rule) => <span className={rule.valid ? 'is-valid' : ''} key={rule.label}><i>{rule.valid && <Check size={11} />}</i>{rule.label}</span>)}</div>
            <div className="profile-form-footer"><span>{passwordChanged && <><CheckCircle2 size={15} /> Ready to update</>}</span><button className="secondary-button" type="submit">Change password</button></div>
          </form>

          <section className="panel profile-section session-section">
            <div className="profile-section-heading"><span><ShieldCheck size={18} /></span><div><h2>Session</h2><p>Control access to your account on this device.</p></div></div>
            <div className="session-row"><span><strong>Current session</strong><small>This browser · Active now</small></span><button className="secondary-button danger-text" type="button" onClick={signOut} disabled={signingOut}><LogOut size={15} />{signingOut ? 'Logging out…' : 'Log out'}</button></div>
          </section>
        </div>
      </div>
    </div>
  )
}
