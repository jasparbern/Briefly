import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Cadence = 'daily' | 'weekly' | 'custom'

type ScheduleInput = {
  day_of_week?: number
  hour_utc?: number
  cadence?: Cadence
  custom_days?: number[] | null
  lookback_days?: number
  delivery_email?: string | null
}

const DEFAULT_SCHEDULE = {
  day_of_week: 0,
  hour_utc: 9,
  cadence: 'weekly' as Cadence,
  custom_days: null as number[] | null,
  lookback_days: 7,
  delivery_email: null as string | null,
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data } = await supabase
    .from('digest_schedule')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json(data ?? DEFAULT_SCHEDULE)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = (await request.json()) as ScheduleInput

  // Validate cadence + custom_days combo.
  const cadence = body.cadence ?? 'weekly'
  if (!['daily', 'weekly', 'custom'].includes(cadence)) {
    return NextResponse.json({ error: 'invalid cadence' }, { status: 400 })
  }
  if (cadence === 'custom' && (!body.custom_days || body.custom_days.length === 0)) {
    return NextResponse.json({ error: 'custom cadence needs at least one day' }, { status: 400 })
  }

  const lookback = body.lookback_days ?? 7
  if (lookback < 1 || lookback > 60) {
    return NextResponse.json({ error: 'lookback_days must be 1–60' }, { status: 400 })
  }

  const row = {
    user_id: user.id,
    day_of_week: body.day_of_week ?? 0,
    hour_utc: body.hour_utc ?? 9,
    cadence,
    custom_days: cadence === 'custom' ? body.custom_days : null,
    lookback_days: lookback,
    delivery_email: body.delivery_email?.trim() || null,
  }

  const { data, error } = await supabase
    .from('digest_schedule')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
