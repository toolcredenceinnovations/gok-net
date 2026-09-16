'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Box,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
} from 'lucide-react'

const highlights = [
  { icon: FileText, label: <>Expense and<br />payment tracking</> },
  { icon: Box, label: <>Clear vendor<br />outstanding</> },
  { icon: Clock3, label: <>Complete audit<br />history</> },
]

export default function LoginPreviewTwoPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="login-two-page">
      <div className="login-two-frame">
        <section className="login-two-form-panel">
          <header className="login-two-brand">
            <span className="login-two-logo-tile">
              <img src="/gokulesh-group-logo.svg" alt="" />
            </span>
            <span>
              <strong>Gokulesh Group</strong>
              <small>GOK-NET</small>
            </span>
          </header>

          <div className="login-two-form-wrap">
            <p className="login-two-kicker">Welcome back</p>
            <h1>Sign in to<br />GOK-NET</h1>
            <p className="login-two-intro">Access the Gokulesh Group site expense ledger.</p>

            <form className="login-two-form" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="login-two-email">Email address</label>
              <div className="login-two-control">
                <Mail size={19} strokeWidth={1.7} />
                <input id="login-two-email" type="email" placeholder="you@example.com" autoComplete="email" />
              </div>

              <label htmlFor="login-two-password">Password</label>
              <div className="login-two-control">
                <LockKeyhole size={19} strokeWidth={1.7} />
                <input
                  id="login-two-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <button className="login-two-submit" type="submit">
                Sign in <ArrowRight size={18} />
              </button>
            </form>

            <p className="login-two-note">
              <LockKeyhole size={15} /> Use the account created by your site owner.
            </p>
          </div>
        </section>

        <section className="login-two-story" aria-label="GOK-NET benefits">
          <div className="login-two-glow" aria-hidden="true" />
          <div className="login-two-copy">
            <p>Expense tracking, simplified</p>
            <h2>One reliable ledger<br />for every rupee spent<br /><em>on site.</em></h2>

            <div className="login-two-highlights">
              {highlights.map(({ icon: Icon, label }) => (
                <div className="login-two-highlight" key={Icon.displayName}>
                  <span><Icon size={25} strokeWidth={1.5} /></span>
                  <p>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="login-two-arch" aria-hidden="true">
            <div className="login-two-arch-sky" />
            <div className="login-two-sun" />
            <div className="login-two-building" />
            <div className="login-two-tree"><i /><i /><i /><i /><i /></div>
          </div>

          <footer className="login-two-story-footer">
            <span><i />Built for a more<br />organised tomorrow</span>
            <span className="login-two-count">01 / 03</span>
            <button type="button" aria-label="Next story"><ArrowRight size={18} /></button>
          </footer>
        </section>
      </div>
    </main>
  )
}
