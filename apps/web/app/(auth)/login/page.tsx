'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense fallback={<Shell><h2 id="login-title">Sign in to GOK-NET</h2></Shell>}>
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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setBusy(false)
      return
    }

    router.replace(next)
    router.refresh()
  }

  return (
    <Shell>
      <div className="login-three-card-heading">
        <p>Welcome back</p>
        <h2 id="login-title">Sign in to GOK-NET</h2>
        <span>Enter your account details to continue.</span>
      </div>

      <form className="login-three-form" onSubmit={signIn}>
        <label htmlFor="login-email">Email address</label>
        <div className="login-three-control">
          <Mail size={18} strokeWidth={1.7} aria-hidden="true" />
          <input
            id="login-email"
            autoFocus
            required
            type="email"
            placeholder="you@gokuleshgroup.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="login-three-label-row">
          <label htmlFor="login-password">Password</label>
        </div>
        <div className="login-three-control">
          <LockKeyhole size={18} strokeWidth={1.7} aria-hidden="true" />
          <input
            id="login-password"
            required
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="login-three-password-toggle"
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="login-three-submit" type="submit" disabled={!email || !password || busy} aria-busy={busy}>
          {busy ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Signing in…
            </>
          ) : (
            <>
              Sign in <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <p className="login-three-access-note">
        <LockKeyhole size={13} /> Authorised Gokulesh Group members only
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="login-three-page">
      <div className="login-three-shade" aria-hidden="true" />

      <header className="login-three-brand">
        <img src="/gokulesh-group-full-logo.svg" alt="Gokulesh Group" />
        <span>Internal operations workspace</span>
      </header>

      <section className="login-three-intro" aria-label="GOK-NET introduction">
        <p>GOK-NET · PRIVATE WORKSPACE</p>
        <h1>Built on clarity.<br />Managed with confidence.</h1>
        <span>One dependable view of expenses, payments, and vendors across every Gokulesh Group site.</span>
      </section>

      <section className="login-three-card" aria-labelledby="login-title">
        {children}
      </section>

      <footer className="login-three-footer">Gokulesh Group · GOK-NET</footer>
    </main>
  )
}
