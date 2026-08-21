import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Two separate gates:
 *   /operator/*  — the Dev layer. Guarded by OPERATOR_SECRET, an env var, not
 *                  a database role. Invisible to the 4–6 real users.
 *   everything else under (app) — needs a Supabase session.
 */
export async function middleware(request: NextRequest) {
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

  const { response, user } = await updateSession(request)

  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/verify')) {
    const redirect = new URL('/login', request.url)
    redirect.searchParams.set('next', pathname)
    return NextResponse.redirect(redirect)
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
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
