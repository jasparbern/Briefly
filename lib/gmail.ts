import { google } from 'googleapis'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { filterByTopic, topicToGmailQueries, type EmailMetadata } from './ai'

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

type StreamFilter = {
  mode: 'senders' | 'topic' | 'both'
  topicDescription: string | null
}

/** Cap on the broad catch-all inbox sample for topic-mode (per stream-run). */
const TOPIC_SAMPLE_CAP = 80
/** Cap on total candidates (search hits + sample) we pull metadata for and filter. */
const TOPIC_CANDIDATE_CAP = 150

/**
 * Fetch emails for one stream of one user, based on the stream's filter mode.
 */
export async function fetchEmailsForStream(
  userId: string,
  streamId: string,
  lookbackDays: number = 7,
  filter: StreamFilter = { mode: 'senders', topicDescription: null }
): Promise<FetchedEmail[]> {
  const supabase = getServiceClient()

  const [{ data: tokenRow }, { data: senders }] = await Promise.all([
    supabase.from('gmail_tokens').select('*').eq('user_id', userId).single(),
    supabase.from('senders').select('*').eq('stream_id', streamId),
  ])

  if (!tokenRow) return []

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
  const sendersList = senders ?? []
  const collected = new Map<string, FetchedEmail>()

  // ---- Sender-mode fetch ----
  if ((filter.mode === 'senders' || filter.mode === 'both') && sendersList.length > 0) {
    const fromQuery = sendersList.map((s) => `from:${s.email}`).join(' OR ')
    const query = `(${fromQuery}) after:${cutoff}`

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
    })

    for (const msg of listRes.data.messages ?? []) {
      if (!msg.id) continue
      const fetched = await fetchFullEmail(gmail, msg.id, sendersList)
      if (fetched) collected.set(msg.id, fetched)
    }
  }

  // ---- Topic-mode fetch ----
  if (filter.mode === 'topic' || filter.mode === 'both') {
    const description = (filter.topicDescription ?? '').trim()
    if (description) {
      // High-recall path: turn the topic into Gmail searches. Gmail matches the full
      // body + subject, so these find relevant mail no matter how deep it sits —
      // unlike a blind "most recent N" sample, which silently drops older-in-window
      // mail once the inbox is busy. We union the search hits with a broad sample
      // (catch-all safety net), dedupe, then let the AI filter trim false positives.
      const queries = await topicToGmailQueries(description)
      const idSet = new Set<string>()

      const searches: Promise<void>[] = queries.map(async (frag) => {
        try {
          const res = await gmail.users.messages.list({
            userId: 'me',
            q: `(${frag}) after:${cutoff}`,
            maxResults: 40,
          })
          for (const m of res.data.messages ?? []) if (m.id) idSet.add(m.id)
        } catch {
          // A malformed AI-generated query shouldn't sink the whole run.
        }
      })

      // Broad fallback sample so nothing on-topic is lost if query gen underperforms.
      searches.push(
        (async () => {
          const res = await gmail.users.messages.list({
            userId: 'me',
            q: `after:${cutoff}`,
            maxResults: TOPIC_SAMPLE_CAP,
          })
          for (const m of res.data.messages ?? []) if (m.id) idSet.add(m.id)
        })()
      )

      await Promise.all(searches)

      // Cap candidates so a broad union can't blow the function time budget. The
      // targeted query hits are already high-precision; this only trims the long tail.
      const candidateIds = Array.from(idSet)
        .filter((id) => !collected.has(id))
        .slice(0, TOPIC_CANDIDATE_CAP)

      // Fetch metadata in parallel for filtering.
      const metas = await Promise.all(
        candidateIds.map((id) => fetchMetadata(gmail, id))
      )
      const validMetas = metas.filter((m): m is EmailMetadata => m !== null)

      const matchingIds = await filterByTopic(validMetas, description)
      const matchingSet = new Set(matchingIds)

      // Now pull full bodies for matches only.
      for (const id of matchingIds) {
        const full = await fetchFullEmail(gmail, id, sendersList)
        if (full) {
          // Override instructions with the topic description for topic-only matches.
          if (!sendersList.some((s) => full.rawFrom.toLowerCase().includes(s.email.toLowerCase()))) {
            full.instructions = `Topic the user wants: ${description}`
          }
          collected.set(id, full)
        } else {
          // No sender match — still surface, with metadata only as the body.
          const meta = validMetas.find((m) => m.id === id)
          if (meta) {
            collected.set(id, {
              gmailMessageId: id,
              sender: meta.from,
              rawFrom: meta.from,
              subject: meta.subject,
              snippet: meta.snippet,
              body: meta.snippet,
              instructions: `Topic the user wants: ${description}`,
              receivedAt: meta.receivedAt,
            })
          }
        }
      }
      // (matchingSet not used after this point — kept for future debug)
      void matchingSet
    }
  }

  return Array.from(collected.values())
}

async function fetchMetadata(
  gmail: ReturnType<typeof google.gmail>,
  id: string
): Promise<EmailMetadata | null> {
  const meta = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'metadata',
    metadataHeaders: ['From', 'Subject', 'Date'],
  })
  const headers = meta.data.payload?.headers ?? []
  const from = headers.find((h) => h.name === 'From')?.value ?? ''
  const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
  const dateHeader = headers.find((h) => h.name === 'Date')?.value ?? ''
  const receivedAt = dateHeader ? new Date(dateHeader) : null
  if (!from) return null
  return {
    id,
    from,
    subject,
    snippet: meta.data.snippet ?? '',
    receivedAt: receivedAt && !isNaN(receivedAt.getTime()) ? receivedAt : null,
  }
}

async function fetchFullEmail(
  gmail: ReturnType<typeof google.gmail>,
  id: string,
  senders: { email: string; label?: string | null; instructions?: string | null }[]
): Promise<FetchedEmail | null> {
  const full = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'full',
  })

  const headers = full.data.payload?.headers ?? []
  const from = headers.find((h) => h.name === 'From')?.value ?? ''
  const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
  const dateHeader = headers.find((h) => h.name === 'Date')?.value ?? ''
  const receivedAt = dateHeader ? new Date(dateHeader) : null

  // Find which configured sender (if any) this matches — used to set instructions + display name.
  const matchedSender = senders.find((s) =>
    from.toLowerCase().includes(s.email.toLowerCase())
  )

  // For sender-mode this is required; for topic-mode caller handles non-matching case.
  if (!matchedSender) return null

  const body = extractBody(full.data.payload)
  const snippet = full.data.snippet ?? body.slice(0, 200)

  return {
    gmailMessageId: id,
    sender: `${matchedSender.label ?? matchedSender.email} <${from}>`,
    rawFrom: from,
    subject,
    snippet,
    body: body.slice(0, 3000),
    instructions: matchedSender.instructions ?? '',
    receivedAt: receivedAt && !isNaN(receivedAt.getTime()) ? receivedAt : null,
  }
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
