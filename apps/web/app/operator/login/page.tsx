'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/** Not linked from anywhere in the user-facing app. Dev access only. */
export default function OperatorLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const res = await fetch('/api/operator/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) router.push('/operator/dashboard')
    else setError('Nope')
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-950 p-6">
      <form onSubmit={submit} className="w-full max-w-xs">
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-4 py-3 font-mono text-neutral-100"
          aria-label="Operator secret"
        />
        {error && <p className="mt-2 font-mono text-sm text-red-400">{error}</p>}
        <button type="submit" className="mt-3 w-full rounded bg-neutral-100 px-4 py-3 font-medium">
          Enter
        </button>
      </form>
    </main>
  )
}
