'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Phone OTP for members, magic link for owner/admin. No passwords — these
 * users will forget them, and every reset is a support call for Suhail.
 */
export default function LoginPage() {
  const [mode, setMode] = useState<'phone' | 'email'>('phone')
  const [value, setValue] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const supabase = createClient()
    const { error } =
      mode === 'phone'
        ? await supabase.auth.signInWithOtp({ phone: normalisePhone(value) })
        : await supabase.auth.signInWithOtp({ email: value.trim() })

    if (error) setError(error.message)
    else setSent(true)
    setBusy(false)
  }

  if (sent) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Check your {mode === 'phone' ? 'phone' : 'email'}</h1>
        <p className="mt-2 text-neutral-600">
          {mode === 'phone'
            ? `We sent a code to ${value}.`
            : `We sent a sign-in link to ${value}.`}
        </p>
        <button onClick={() => setSent(false)} className="mt-6 text-sm underline">
          Use a different {mode === 'phone' ? 'number' : 'address'}
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight">SiteKhata</h1>
      <p className="mt-1 text-neutral-600">Sign in to your site ledger.</p>

      <div className="mt-6 flex gap-1 rounded-lg bg-neutral-100 p-1">
        {(['phone', 'email'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setValue(''); setError(null) }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              mode === m ? 'bg-white shadow-sm' : 'text-neutral-600'
            }`}
          >
            {m === 'phone' ? 'Phone' : 'Email'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4">
        <input
          autoFocus
          type={mode === 'phone' ? 'tel' : 'email'}
          inputMode={mode === 'phone' ? 'numeric' : 'email'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === 'phone' ? '98765 43210' : 'you@example.com'}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-lg"
          aria-label={mode === 'phone' ? 'Phone number' : 'Email address'}
        />
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={!value || busy}
          className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-3 text-lg font-medium text-white disabled:opacity-40"
        >
          {busy ? 'Sending…' : mode === 'phone' ? 'Send code' : 'Send link'}
        </button>
      </form>
    </Shell>
  )
}

/** Supabase wants E.164; the client will type a local 10-digit number. */
function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  return digits.startsWith('+') ? digits : `+${digits}`
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
