'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPreviewPage() {
  return (
    <Suspense fallback={<PreviewShell><h1>Welcome back</h1></PreviewShell>}>
      <LoginPreviewForm />
    </Suspense>
  )
}

function LoginPreviewForm() {
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

    if (signInError) setError(signInError.message)
    else {
      router.replace(next)
      router.refresh()
    }
    setBusy(false)
  }

  return (
    <PreviewShell>
      <div className="login-preview-heading">
        <p className="eyebrow">Private workspace</p>
        <h1>Welcome back</h1>
        <p>Sign in to manage site expenses, payments, and vendors.</p>
      </div>

      <form onSubmit={signIn} className="login-preview-form">
        <label htmlFor="preview-email">Email address</label>
        <input
          id="preview-email"
          autoFocus
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@gokuleshgroup.com"
          className="auth-input"
        />

        <div className="login-preview-label-row">
          <label htmlFor="preview-password">Password</label>
          <span>Contact your administrator for access</span>
        </div>
        <div className="login-preview-password">
          <input
            id="preview-password"
            required
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="auth-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" disabled={!email || !password || busy} className="primary-button login-preview-submit">
          {busy ? 'Signing in…' : <>Sign in to GOK-NET <ArrowRight size={16} /></>}
        </button>
      </form>

      <p className="login-preview-security">
        <LockKeyhole size={14} /> Secured access for authorised Gokulesh Group members
      </p>
    </PreviewShell>
  )
}

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="login-preview-page">
      <section className="login-preview-content">
        <img className="login-preview-logo" src="/gokulesh-group-full-logo.svg" alt="Gokulesh Group" />
        <div className="login-preview-card">{children}</div>
        <p className="login-preview-footnote">GOK-NET · Internal operations workspace</p>
      </section>

      <section className="login-preview-visual" aria-label="Gokulesh Group property portfolio illustration">
        <div className="login-preview-grid" aria-hidden="true" />
        <div className="building-chip building-chip-one"><Building2 /></div>
        <div className="building-chip building-chip-two"><Building2 /></div>
        <div className="building-chip building-chip-three"><Building2 /></div>
        <div className="login-preview-message">
          <span>Built for every site</span>
          <h2>One clear view across every project.</h2>
          <p>Track expenses, payments, and outstanding balances with confidence.</p>
        </div>
        <SkylineIllustration />
      </section>
    </main>
  )
}

function SkylineIllustration() {
  return (
    <svg className="login-preview-skyline" viewBox="0 0 820 390" fill="none" aria-hidden="true">
      <path d="M3 387V265L96 225V387M68 387V282L143 252L190 274V387" />
      <path d="M145 387V153L247 104L334 145V387" />
      <path d="M334 387V209L424 166L492 202V387" />
      <path d="M493 387V87L598 35L702 86V387" />
      <path d="M702 387V196L817 143V387" />
      <path d="M247 104V387M598 35V387M702 86V387" />
      <path className="skyline-accent" d="M493 387V87L598 35V387" />
      <path className="skyline-soft" d="M3 387V265L68 282V387M334 387V209L424 166V387M702 387V196L817 143V387" />
      <g className="skyline-windows">
        <path d="M174 191v22M205 176v22M174 233v22M205 218v22M174 275v22M205 260v22M174 317v22M205 302v22" />
        <path d="M371 237v19M399 224v19M436 223v19M464 238v19M371 277v19M399 264v19M436 263v19M464 278v19M371 317v19M399 304v19M436 303v19M464 318v19" />
        <path d="M529 133v22M559 118v22M529 177v22M559 162v22M529 221v22M559 206v22M529 265v22M559 250v22M529 309v22M559 294v22" />
        <path d="M738 222l45-21M738 263l45-21M738 304l45-21M738 345l45-21" />
      </g>
      <path className="skyline-ground" d="M0 387h820" />
    </svg>
  )
}
