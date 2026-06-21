import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/streams — list current user's streams
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/streams — create a new stream
// Body: { name, cadence?, day_of_week?, hour_utc?, custom_days?, lookback_days?, delivery_email? }
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json() as {
    name?: string
    cadence?: 'daily' | 'weekly' | 'custom'
    day_of_week?: number
    hour_utc?: number
    custom_days?: number[] | null
    lookback_days?: number
    delivery_email?: string | null
  }

  const name = (body.name ?? '').trim() || 'New stream'

  const { data, error } = await supabase
    .from('streams')
    .insert({
      user_id: user.id,
      name,
      filter_mode: 'senders',
      cadence: body.cadence ?? 'weekly',
      day_of_week: body.day_of_week ?? 0,
      hour_utc: body.hour_utc ?? 9,
      custom_days: body.cadence === 'custom' ? (body.custom_days ?? []) : null,
      lookback_days: body.lookback_days ?? 7,
      delivery_email: body.delivery_email?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
