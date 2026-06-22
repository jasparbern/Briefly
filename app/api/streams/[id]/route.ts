import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserLimits } from '@/lib/stripe'

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/streams/:id — update stream settings
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json() as Partial<{
    name: string
    filter_mode: 'senders' | 'topic' | 'both'
    topic_description: string | null
    cadence: 'daily' | 'weekly' | 'custom'
    day_of_week: number
    hour_utc: number
    custom_days: number[] | null
    lookback_days: number
    delivery_email: string | null
    paused: boolean
  }>

  // Whitelist columns; never trust the client to send arbitrary keys.
  const patch: Record<string, unknown> = {}
  for (const key of [
    'name', 'filter_mode', 'topic_description', 'cadence',
    'day_of_week', 'hour_utc', 'custom_days', 'lookback_days',
    'delivery_email', 'paused',
  ] as const) {
    if (key in body) patch[key] = body[key]
  }

  if (typeof patch.delivery_email === 'string') {
    patch.delivery_email = (patch.delivery_email as string).trim() || null
  }
  if (patch.cadence && patch.cadence !== 'custom') {
    patch.custom_days = null
  }

  const limits = await getUserLimits(user.id)
  if (patch.cadence && !limits.allowedCadences.includes(patch.cadence as 'daily' | 'weekly' | 'custom')) {
    return NextResponse.json(
      { error: `Your plan only supports ${limits.allowedCadences.join(', ')} delivery. Upgrade for daily and custom schedules.`, upgradeRequired: true },
      { status: 402 }
    )
  }
  if (patch.delivery_email && !limits.alternateDeliveryEmail) {
    return NextResponse.json(
      { error: 'Alternate delivery email is a Pro feature. Upgrade to send digests to a different inbox.', upgradeRequired: true },
      { status: 402 }
    )
  }

  const { data, error } = await supabase
    .from('streams')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/streams/:id — drops the stream and cascades to its senders/digests
export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  await supabase.from('streams').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
