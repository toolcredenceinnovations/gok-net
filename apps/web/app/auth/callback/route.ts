import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Magic-link landing. Supabase sends the user here with a `code`; this
 * exchanges it for a session cookie and forwards them into the app.
 *
 * The phone OTP flow does not come through here — `verifyOtp` on the login
 * screen establishes that session directly in the browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')

  // Only ever redirect to a path on this origin. An open redirect here would
  // let a crafted sign-in link bounce a freshly authenticated user offsite.
  const requested = searchParams.get('next') ?? '/dashboard'
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login?error=link_expired', origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
