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
// Picks every user whose cadence fires today:
//   - daily: always
//   - weekly: when today === day_of_week
//   - custom: when today is in custom_days[]
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = authHeader?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const userIds = await selectUsersForToday(supabase)
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

type ScheduleRow = {
  user_id: string
  day_of_week: number
  cadence: 'daily' | 'weekly' | 'custom' | null
  custom_days: number[] | null
}

async function selectUsersForToday(supabase: ReturnType<typeof getServiceClient>): Promise<string[]> {
  const today = new Date().getDay()
  const { data } = await supabase
    .from('digest_schedule')
    .select('user_id, day_of_week, cadence, custom_days')

  const rows = (data ?? []) as ScheduleRow[]

  return rows
    .filter((r) => {
      const cadence = r.cadence ?? 'weekly'
      if (cadence === 'daily') return true
      if (cadence === 'weekly') return r.day_of_week === today
      if (cadence === 'custom') return (r.custom_days ?? []).includes(today)
      return false
    })
    .map((r) => r.user_id)
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
    // Cron: verify secret, then pick users whose cadence fires today.
    const secret = authHeader?.replace('Bearer ', '')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    userIds = await selectUsersForToday(getServiceClient())
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

  // Get user email + optional delivery override.
  const { data: userData } = await supabase.auth.admin.getUserById(userId)
  const accountEmail = userData.user?.email
  if (!accountEmail) throw new Error('No email for user')

  const { data: scheduleRow } = await supabase
    .from('digest_schedule')
    .select('lookback_days, delivery_email')
    .eq('user_id', userId)
    .maybeSingle()

  const lookbackDays = scheduleRow?.lookback_days ?? 7
  const deliveryEmail = scheduleRow?.delivery_email || accountEmail

  const emails = await fetchEmailsForUser(userId, lookbackDays)
  const digest = await generateDigest(emails)

  await sendDigestEmail(deliveryEmail, digest)

  // Archive the digest. Capture id so we can link processed emails to it.
  const { data: digestRow } = await supabase
    .from('digests')
    .insert({
      user_id: userId,
      content: `SUBJECT: ${digest.subject}\n\n${digest.body}`,
    })
    .select('id')
    .single()

  // Save each processed email for the "what did the AI read?" view.
  // Upsert so re-runs don't duplicate, and so we can later attribute to the newest digest.
  if (digestRow && emails.length > 0) {
    await supabase.from('digest_emails').upsert(
      emails.map((e) => ({
        user_id: userId,
        digest_id: digestRow.id,
        gmail_message_id: e.gmailMessageId,
        sender: e.rawFrom,
        subject: e.subject,
        snippet: e.snippet,
        received_at: e.receivedAt?.toISOString() ?? null,
      })),
      { onConflict: 'user_id,gmail_message_id' }
    )
  }
}
