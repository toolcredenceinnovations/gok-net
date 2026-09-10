'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Phone OTP for members, magic link for owner/admin. No passwords — these
 * users will forget them, and every reset is a support call for Suhail.
 *
 * The phone flow completes here: Supabase sends the code, the user types it
 * back, and `verifyOtp` exchanges it for a session. The magic-link flow
 * finishes in the email client, so this screen just tells them to go look.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<Shell><h1>Sign in to SiteKhata</h1></Shell>}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/dashboard'

  const [mode, setMode] = useState<'phone' | 'email'>('phone')
  const [value, setValue] = useState('')
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function sendCode(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const supabase = createClient()
    const { error } =
      mode === 'phone'
        ? await supabase.auth.signInWithOtp({ phone: normalisePhone(value) })
        : await supabase.auth.signInWithOtp({
            email: value.trim(),
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
          })

    if (error) setError(error.message)
    else setSent(true)
    setBusy(false)
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      phone: normalisePhone(value),
      token: code,
      type: 'sms',
    })

    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }

    // refresh() so the server components re-run with the new auth cookie.
    router.replace(next)
    router.refresh()
  }

  if (sent) {
    return (
      <Shell>
        <div className="auth-success">
          <CheckCircle2 size={24} />
        </div>
        <p className="eyebrow">Almost there</p>
        <h1>Check your {mode === 'phone' ? 'phone' : 'email'}</h1>
        <p className="auth-description">
          {mode === 'phone'
            ? `We sent a 6-digit code to ${value}.`
            : `We sent a sign-in link to ${value}. Open it on this device.`}
        </p>

        {mode === 'phone' && (
          <form onSubmit={verifyCode} className="auth-form">
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="······"
              aria-label="6-digit sign-in code"
              className="auth-input otp-input"
            />
            {error && <p className="auth-error">{error}</p>}
            <button
              type="submit"
              disabled={code.length !== 6 || busy}
              className="primary-button auth-submit"
            >
              {busy ? 'Checking…' : <>Verify code <ArrowRight size={16} /></>}
            </button>
          </form>
        )}

        {mode === 'email' && error && <p className="auth-error">{error}</p>}

        <button
          onClick={() => {
            setSent(false)
            setCode('')
            setError(null)
          }}
          className="auth-text-button"
        >
          Use a different {mode === 'phone' ? 'number' : 'address'}
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      <p className="eyebrow">Welcome back</p>
      <h1>Sign in to SiteKhata</h1>
      <p className="auth-description">Access the Gokulesh Group site expense ledger.</p>

      <div className="auth-tabs">
        {(['phone', 'email'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setValue('')
              setError(null)
            }}
            className={mode === m ? 'is-active' : ''}
          >
            {m === 'phone' ? (
              <>
                <Phone size={14} />
                Phone
              </>
            ) : (
              <>
                <Mail size={14} />
                Email
              </>
            )}
          </button>
        ))}
      </div>

      <form onSubmit={sendCode} className="auth-form">
        <label htmlFor="login-identifier">
          {mode === 'phone' ? 'Mobile number' : 'Email address'}
        </label>
        <input
          id="login-identifier"
          autoFocus
          type={mode === 'phone' ? 'tel' : 'email'}
          inputMode={mode === 'phone' ? 'numeric' : 'email'}
          autoComplete={mode === 'phone' ? 'tel' : 'email'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'phone' ? '98765 43210' : 'you@example.com'}
          className="auth-input"
        />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={!value || busy} className="primary-button auth-submit">
          {busy ? (
            'Sending…'
          ) : mode === 'phone' ? (
            <>
              Send code <ArrowRight size={16} />
            </>
          ) : (
            <>
              Send sign-in link <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
      <p className="auth-security">
        <LockKeyhole size={13} /> Secure sign-in. No password required.
      </p>
    </Shell>
  )
}

/** Supabase wants E.164; the client will type a local 10-digit number. */
function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <img src="/gokulesh-group-logo.svg" alt="Gokulesh Group mark" />
          <span>
            <strong>Gokulesh Group</strong>
            <small>SiteKhata</small>
          </span>
        </div>
        <div className="auth-quote">
          <p>“One reliable ledger for every rupee spent on site.”</p>
          <span>Skyline Residency · Mumbai</span>
        </div>
        <div className="auth-features">
          <span>
            <CheckCircle2 size={14} /> Expense and payment tracking
          </span>
          <span>
            <CheckCircle2 size={14} /> Clear vendor outstanding
          </span>
          <span>
            <CheckCircle2 size={14} /> Complete audit history
          </span>
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-card">{children}</div>
        <p className="auth-footer">Private workspace for authorised Gokulesh Group members.</p>
      </section>
    </main>
  )
}
