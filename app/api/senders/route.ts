import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data } = await supabase
    .from('senders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { email, label, instructions } = body

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { data, error } = await supabase.from('senders').upsert(
    { user_id: user.id, email, label, instructions },
    { onConflict: 'user_id,email' }
  ).select().single()

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
