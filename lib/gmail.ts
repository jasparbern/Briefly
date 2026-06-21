import { google } from 'googleapis'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  )
}

export type FetchedEmail = {
  gmailMessageId: string
  sender: string
  rawFrom: string
  subject: string
  snippet: string
  body: string
  instructions: string
  receivedAt: Date | null
}

/**
 * Fetch emails for one stream of one user. Pulls only senders attached to that stream.
 */
export async function fetchEmailsForStream(
  userId: string,
  streamId: string,
  lookbackDays: number = 7
): Promise<FetchedEmail[]> {
  const supabase = getServiceClient()

  const [{ data: tokenRow }, { data: senders }] = await Promise.all([
    supabase.from('gmail_tokens').select('*').eq('user_id', userId).single(),
    supabase.from('senders').select('*').eq('stream_id', streamId),
  ])

  if (!tokenRow || !senders || senders.length === 0) return []

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date,
  })

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await supabase
        .from('gmail_tokens')
        .update({
          access_token: tokens.access_token,
          expiry_date: tokens.expiry_date,
        })
        .eq('user_id', userId)
    }
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const cutoff = Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000)
  const fromQuery = senders.map((s) => `from:${s.email}`).join(' OR ')
  const query = `(${fromQuery}) after:${cutoff}`

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 100,
  })

  const messages = listRes.data.messages ?? []
  const results: FetchedEmail[] = []

  for (const msg of messages) {
    if (!msg.id) continue

    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'full',
    })

    const headers = full.data.payload?.headers ?? []
    const from = headers.find((h) => h.name === 'From')?.value ?? ''
    const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
    const dateHeader = headers.find((h) => h.name === 'Date')?.value ?? ''
    const receivedAt = dateHeader ? new Date(dateHeader) : null

    const matchedSender = senders.find((s) =>
      from.toLowerCase().includes(s.email.toLowerCase())
    )
    if (!matchedSender) continue

    const body = extractBody(full.data.payload)
    const snippet = full.data.snippet ?? body.slice(0, 200)

    results.push({
      gmailMessageId: msg.id,
      sender: `${matchedSender.label ?? matchedSender.email} <${from}>`,
      rawFrom: from,
      subject,
      snippet,
      body: body.slice(0, 3000),
      instructions: matchedSender.instructions ?? '',
      receivedAt: receivedAt && !isNaN(receivedAt.getTime()) ? receivedAt : null,
    })
  }

  return results
}

function extractBody(payload: any): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractBody(part)
      if (text) return text
    }
  }
  return ''
}
