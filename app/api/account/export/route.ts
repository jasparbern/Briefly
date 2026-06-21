import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/account/export — returns a JSON dump of everything we have on the current user.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const [streams, senders, digests, digestEmails, schedule] = await Promise.all([
    supabase.from('streams').select('*').eq('user_id', user.id),
    supabase.from('senders').select('*').eq('user_id', user.id),
    supabase.from('digests').select('*').eq('user_id', user.id),
    supabase.from('digest_emails').select('*').eq('user_id', user.id),
    supabase.from('digest_schedule').select('*').eq('user_id', user.id),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    streams: streams.data ?? [],
    senders: senders.data ?? [],
    digests: digests.data ?? [],
    processed_emails: digestEmails.data ?? [],
    legacy_schedule: schedule.data ?? [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="briefly-export-${user.id.slice(0, 8)}.json"`,
    },
  })
}
