import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getUserTier, LIMITS } from '@/lib/stripe'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const tier = await getUserTier(user.id)
  return NextResponse.json({ tier, limits: LIMITS[tier] })
}
