import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateDigest } from '@/lib/ai'
import { FIXTURES, getFixture } from '@/lib/eval-fixtures'

// Admin gate. Only this email may run evals.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'jasparbbernstein@gmail.com'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, error: 'Not authenticated' }
  if (user.email !== ADMIN_EMAIL) return { ok: false as const, status: 403, error: 'Forbidden' }
  return { ok: true as const, user }
}

// GET /api/eval — list fixtures (id, name, expectation only)
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  return NextResponse.json(
    FIXTURES.map((f) => ({ id: f.id, name: f.name, expectation: f.expectation, count: f.emails.length }))
  )
}

// POST /api/eval  Body: { fixtureId }
// Runs generateDigest against the fixture and returns { subject, body, ms }
export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { fixtureId } = (await request.json()) as { fixtureId?: string }
  if (!fixtureId) return NextResponse.json({ error: 'fixtureId required' }, { status: 400 })

  const fixture = getFixture(fixtureId)
  if (!fixture) return NextResponse.json({ error: 'Unknown fixture' }, { status: 404 })

  const started = Date.now()
  const digest = await generateDigest(fixture.emails)
  const ms = Date.now() - started

  return NextResponse.json({
    fixture: { id: fixture.id, name: fixture.name, expectation: fixture.expectation, count: fixture.emails.length },
    subject: digest.subject,
    body: digest.body,
    ms,
  })
}
