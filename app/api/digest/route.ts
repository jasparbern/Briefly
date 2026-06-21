import { createClient as createServiceClient } from '@supabase/supabase-js'
import { fetchEmailsForStream } from '@/lib/gmail'
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

type StreamRow = {
  id: string
  user_id: string
  name: string
  cadence: 'daily' | 'weekly' | 'custom'
  day_of_week: number
  custom_days: number[] | null
  lookback_days: number
  delivery_email: string | null
  paused: boolean
  filter_mode: 'senders' | 'topic' | 'both'
  topic_description: string | null
}

// GET /api/digest — called by Vercel cron once a day.
// Selects every (unpaused) stream whose cadence fires today.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = authHeader?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const streams = await selectStreamsForToday(supabase)
  const results = await Promise.allSettled(streams.map(processStream))

  return NextResponse.json({
    processed: streams.length,
    results: results.map((r, i) => ({
      streamId: streams[i].id,
      userId: streams[i].user_id,
      status: r.status,
      error: r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : undefined,
    })),
  })
}

// POST /api/digest — manual trigger from the dashboard.
// Body: { streamId } (optional). If omitted, fires every stream for the logged-in user.
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const isManual = authHeader === null

  let streams: StreamRow[]

  if (isManual) {
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    let streamId: string | undefined
    try {
      const body = await request.json()
      streamId = body?.streamId
    } catch {
      // No body — fire all streams.
    }

    const service = getServiceClient()
    let q = service.from('streams').select('*').eq('user_id', user.id).eq('paused', false)
    if (streamId) q = q.eq('id', streamId)
    const { data } = await q
    streams = (data ?? []) as StreamRow[]
  } else {
    const secret = authHeader?.replace('Bearer ', '')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    streams = await selectStreamsForToday(getServiceClient())
  }

  const results = await Promise.allSettled(streams.map(processStream))

  return NextResponse.json({
    processed: streams.length,
    results: results.map((r, i) => ({
      streamId: streams[i].id,
      userId: streams[i].user_id,
      status: r.status,
      error: r.status === 'rejected' ? String((r as PromiseRejectedResult).reason) : undefined,
    })),
  })
}

async function selectStreamsForToday(supabase: ReturnType<typeof getServiceClient>): Promise<StreamRow[]> {
  const today = new Date().getDay()
  const { data } = await supabase.from('streams').select('*').eq('paused', false)
  const rows = (data ?? []) as StreamRow[]

  return rows.filter((r) => {
    const cadence = r.cadence ?? 'weekly'
    if (cadence === 'daily') return true
    if (cadence === 'weekly') return r.day_of_week === today
    if (cadence === 'custom') return (r.custom_days ?? []).includes(today)
    return false
  })
}

async function processStream(stream: StreamRow) {
  const supabase = getServiceClient()

  const { data: userData } = await supabase.auth.admin.getUserById(stream.user_id)
  const accountEmail = userData.user?.email
  if (!accountEmail) throw new Error('No email for user')

  const deliveryEmail = stream.delivery_email || accountEmail

  const emails = await fetchEmailsForStream(
    stream.user_id,
    stream.id,
    stream.lookback_days ?? 7,
    {
      mode: stream.filter_mode ?? 'senders',
      topicDescription: stream.topic_description,
    }
  )
  const digest = await generateDigest(emails)

  // Stamp the stream name onto the subject so multi-stream users can tell digests apart.
  const subject = stream.name && stream.name !== 'Default'
    ? `${digest.subject.replace(/^📬 Briefly[—\-: ]*/, '📬 Briefly · ' + stream.name + ' — ')}`
    : digest.subject

  await sendDigestEmail(deliveryEmail, { subject, body: digest.body })

  const { data: digestRow } = await supabase
    .from('digests')
    .insert({
      user_id: stream.user_id,
      stream_id: stream.id,
      content: `SUBJECT: ${subject}\n\n${digest.body}`,
    })
    .select('id')
    .single()

  if (digestRow && emails.length > 0) {
    await supabase.from('digest_emails').upsert(
      emails.map((e) => ({
        user_id: stream.user_id,
        stream_id: stream.id,
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
