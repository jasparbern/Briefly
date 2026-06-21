import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/senders?streamId=<uuid>  — list senders for one stream
// GET /api/senders                  — list ALL senders for current user (back-compat)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const url = new URL(request.url)
  const streamId = url.searchParams.get('streamId')

  let q = supabase
    .from('senders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (streamId) q = q.eq('stream_id', streamId)

  const { data } = await q
  return NextResponse.json(data ?? [])
}

// POST /api/senders  Body: { email, label?, instructions?, stream_id }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json() as {
    email?: string
    label?: string | null
    instructions?: string | null
    stream_id?: string
  }

  if (!body.email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
  if (!body.stream_id) return NextResponse.json({ error: 'stream_id required' }, { status: 400 })

  // Verify the stream belongs to this user before letting them attach senders.
  const { data: streamRow } = await supabase
    .from('streams')
    .select('id')
    .eq('id', body.stream_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!streamRow) return NextResponse.json({ error: 'stream not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('senders')
    .upsert(
      {
        user_id: user.id,
        stream_id: body.stream_id,
        email: body.email,
        label: body.label ?? null,
        instructions: body.instructions ?? null,
      },
      { onConflict: 'user_id,email' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json() as {
    id: string
    email?: string
    label?: string | null
    instructions?: string | null
  }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (body.email !== undefined) patch.email = body.email
  if (body.label !== undefined) patch.label = body.label
  if (body.instructions !== undefined) patch.instructions = body.instructions

  const { data, error } = await supabase
    .from('senders')
    .update(patch)
    .eq('id', body.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await request.json()
  await supabase.from('senders').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
