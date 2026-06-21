import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data } = await supabase
    .from('digest_schedule')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data ?? { day_of_week: 0, hour_utc: 9 })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { day_of_week, hour_utc } = await request.json()

  const { data, error } = await supabase.from('digest_schedule').upsert(
    { user_id: user.id, day_of_week, hour_utc },
    { onConflict: 'user_id' }
  ).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
