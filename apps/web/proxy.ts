import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@gok-net/shared/types/database'

/**
 * Next 16 renamed `middleware.ts` to `proxy.ts`; same runtime, same config.
 *
 * User routes require a valid Supabase session. `/operator/*` is unrelated
 * to user auth and keeps its own environment-secret gate.
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

  const response = NextResponse.next({ request })
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const publicPath = pathname === '/login' || pathname.startsWith('/auth/')
  if (!user && !publicPath) return NextResponse.redirect(new URL('/login', request.url))

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
