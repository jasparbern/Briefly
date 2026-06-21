import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/digest-emails — list the emails Briefly processed for the current user.
// Optional query: ?limit=N&digestId=<uuid> to scope to one digest.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500)
  const digestId = url.searchParams.get('digestId')

  let q = supabase
    .from('digest_emails')
    .select('id, gmail_message_id, sender, subject, snippet, received_at, created_at, digest_id')
    .eq('user_id', user.id)
    .order('received_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (digestId) q = q.eq('digest_id', digestId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// DELETE /api/digest-emails — body: { id }
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = (await request.json()) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await supabase.from('digest_emails').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
