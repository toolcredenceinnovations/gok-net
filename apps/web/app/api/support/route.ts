import { NextResponse } from 'next/server'
import { helpRequestSchema } from '@gok-net/shared'
import { getSession } from '@/lib/auth/session'
import { sendSupportEmail } from '@/lib/email'

/** Help & support form — validates, then emails hello@credenceinnovations.co. */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = helpRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the form and try again' },
      { status: 400 }
    )
  }

  try {
    await sendSupportEmail({ ...parsed.data, siteName: session.siteName, role: session.role })
    return NextResponse.json({ data: { sent: true } })
  } catch (err) {
    console.error('support request failed', err)
    return NextResponse.json({ error: 'Could not send your message. Try again.' }, { status: 500 })
  }
}
