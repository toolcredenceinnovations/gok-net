import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`; same runtime, same config.
 *
 * AUTH REMOVED (temporary): the Supabase-session gate on (app)/* routes is
 * stripped out while the auth service backend is rebuilt from scratch.
 * `lib/auth/session.ts` hands out a fixed mock session instead, so every
 * route below is effectively open. `/operator/*` is unrelated to user auth
 * (env-secret guarded, not a database role) and keeps its own gate.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/operator')) {
    if (pathname === '/operator/login') return NextResponse.next()

    const token = request.cookies.get('operator_token')?.value
    const secret = process.env.OPERATOR_SECRET

    // Fail closed: no secret configured means no access, ever.
    if (!secret || !token || !timingSafeEqual(token, secret)) {
      return NextResponse.redirect(new URL('/operator/login', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

/** Constant-time compare, so the secret can't be recovered by timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
