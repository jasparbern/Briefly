import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const TYPES = ['feedback', 'bug', 'question', 'other'] as const
type FeedbackType = (typeof TYPES)[number]

function isType(s: unknown): s is FeedbackType {
  return typeof s === 'string' && (TYPES as readonly string[]).includes(s)
}

export async function POST(request: Request) {
  let body: { name?: string; email?: string; type?: string; message?: string; website?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: real users never fill this hidden field; bots autofill everything.
  if (body.website && body.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const name = (body.name ?? '').trim().slice(0, 120)
  const email = (body.email ?? '').trim().slice(0, 200)
  const message = (body.message ?? '').trim().slice(0, 5000)
  const type: FeedbackType = isType(body.type) ? body.type : 'other'

  if (!message) return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
  if (message.length < 4) return NextResponse.json({ error: 'A bit more detail, please.' }, { status: 400 })
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'That email looks off.' }, { status: 400 })
  }

  const inboxAddress = process.env.FEEDBACK_INBOX ?? 'jasparbbernstein@gmail.com'
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'Abridgly <onboarding@resend.dev>'

  const subject = `[Abridgly · ${type}] ${name ? `from ${name}` : 'anonymous'}`
  const text = [
    `Type: ${type}`,
    `Name: ${name || '—'}`,
    `Email: ${email || '—'}`,
    '',
    message,
  ].join('\n')

  try {
    await resend.emails.send({
      from: fromAddress,
      to: inboxAddress,
      replyTo: email || undefined,
      subject,
      text,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Could not send. Try emailing jasparbbernstein@gmail.com directly.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
