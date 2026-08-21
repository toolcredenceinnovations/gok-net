import { NextResponse } from 'next/server'

/**
 * Operator login. Not a user account — a single shared secret held in an env
 * var, checked here and stored in an httpOnly cookie the middleware reads.
 */
export async function POST(request: Request) {
  const secret = process.env.OPERATOR_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Operator access is not configured' }, { status: 503 })
  }

  const { password } = await request.json()
  if (typeof password !== 'string' || !timingSafeEqual(password, secret)) {
    return NextResponse.json({ error: 'Nope' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('operator_token', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/operator',
    maxAge: 60 * 60 * 8, // 8 hours
  })
  return response
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
