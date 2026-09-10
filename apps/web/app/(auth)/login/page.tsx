'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Early launch sign-in uses email and password. The owner creates accounts
 * for the team; OTP and invitation flows can be added after launch.
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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) setError(error.message)
    else {
      router.replace(next)
      router.refresh()
    }
    setBusy(false)
  }

  return (
    <Shell>
      <p className="eyebrow">Welcome back</p>
      <h1>Sign in to SiteKhata</h1>
      <p className="auth-description">Access the Gokulesh Group site expense ledger.</p>

      <form onSubmit={signIn} className="auth-form">
        <label htmlFor="login-identifier">
          Email address
        </label>
        <input
          id="login-identifier"
          autoFocus
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="auth-input"
        />
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={!email || !password || busy} className="primary-button auth-submit">
          {busy ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
        </button>
      </form>
      <p className="auth-security">
        <LockKeyhole size={13} /> Use the account created by your site owner.
      </p>
    </Shell>
  )
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
