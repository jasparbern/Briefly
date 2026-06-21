import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fetchEmailsForUser } from '@/lib/gmail'
import { generateDigest } from '@/lib/ai'
import { sendDigestEmail } from '@/lib/email'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/digest — called by Vercel cron once a day.
// Free tier only allows daily cron, so we send to every user scheduled for today,
// ignoring the per-user hour_utc preference for now.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = authHeader?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const now = new Date()
  const dayOfWeek = now.getDay()

  const { data: schedules } = await supabase
    .from('digest_schedule')
    .select('user_id')
    .eq('day_of_week', dayOfWeek)

  const userIds = (schedules ?? []).map((s: { user_id: string }) => s.user_id)
  const results = await Promise.allSettled(userIds.map(processUserDigest))

  return NextResponse.json({
    processed: userIds.length,
    results: results.map((r, i) => ({
      userId: userIds[i],
      status: r.status,
      error: r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : undefined,
    })),
  })
}

// POST /api/digest — called manually from dashboard
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const isManual = authHeader === null // manual trigger from dashboard uses session

  let userIds: string[]

  if (isManual) {
    // Manual trigger: only run for the logged-in user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    userIds = [user.id]
  } else {
    // Cron: verify secret, then run for all scheduled users
    const secret = authHeader?.replace('Bearer ', '')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const now = new Date()
    const dayOfWeek = now.getDay()

    const { data: schedules } = await supabase
      .from('digest_schedule')
      .select('user_id')
      .eq('day_of_week', dayOfWeek)

    userIds = (schedules ?? []).map((s) => s.user_id)
  }

  const results = await Promise.allSettled(
    userIds.map((userId) => processUserDigest(userId))
  )

  return NextResponse.json({
    processed: userIds.length,
    results: results.map((r, i) => ({
      userId: userIds[i],
      status: r.status,
      error: r.status === 'rejected' ? String(r.reason) : undefined,
    })),
  })
}

async function processUserDigest(userId: string) {
  const supabase = getServiceClient()

  // Get user email
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  const email = userData.user?.email
  if (!email) throw new Error('No email for user')

  const emails = await fetchEmailsForUser(userId)
  const digest = await generateDigest(emails)

  await sendDigestEmail(email, digest)

  // Archive it. Store the body so old viewers keep working; subject lives in metadata.
  await supabase.from('digests').insert({
    user_id: userId,
    content: `SUBJECT: ${digest.subject}\n\n${digest.body}`,
  })
}
