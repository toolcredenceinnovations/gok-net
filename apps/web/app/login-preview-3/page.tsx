'use client'

import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'

export default function LoginPreviewThreePage() {
  const [showPassword, setShowPassword] = useState(false)

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

      <section className="login-three-card" aria-labelledby="login-three-title">
        <div className="login-three-card-heading">
          <p>Welcome back</p>
          <h2 id="login-three-title">Sign in to GOK-NET</h2>
          <span>Enter your account details to continue.</span>
        </div>

        <form className="login-three-form" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="login-three-email">Email address</label>
          <div className="login-three-control">
            <Mail size={18} strokeWidth={1.7} aria-hidden="true" />
            <input id="login-three-email" type="email" placeholder="you@gokuleshgroup.com" autoComplete="email" />
          </div>

          <div className="login-three-label-row">
            <label htmlFor="login-three-password">Password</label>
            <button type="button">Forgot password?</button>
          </div>
          <div className="login-three-control">
            <LockKeyhole size={18} strokeWidth={1.7} aria-hidden="true" />
            <input
              id="login-three-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
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

          <label className="login-three-remember">
            <input type="checkbox" />
            <span>Keep me signed in on this device</span>
          </label>

          <button className="login-three-submit" type="submit">
            Sign in <ArrowRight size={17} />
          </button>
        </form>

        <p className="login-three-access-note">
          <LockKeyhole size={13} /> Authorised Gokulesh Group members only
        </p>
      </section>

      <footer className="login-three-footer">Gokulesh Group · GOK-NET</footer>
    </main>
  )
}
