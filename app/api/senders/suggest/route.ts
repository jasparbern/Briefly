import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// POST /api/senders/suggest
// Body: { description: string }
// Returns: { suggestions: { email: string, label: string, sample_subject: string, reason: string }[] }
//
// Pulls a sample of the user's recent inbox, asks Claude to pick senders matching
// the description, returns structured suggestions for the user to confirm.

export async function POST(request: Request) {
  const userSupabase = await createClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = (await request.json()) as { description?: string }
  const description = (body.description ?? '').trim()
  if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 })

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: tokenRow } = await service
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', user.id)
    .single()
  if (!tokenRow) {
    return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  )
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date,
  })
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await service.from('gmail_tokens').update({
        access_token: tokens.access_token,
        expiry_date: tokens.expiry_date,
      }).eq('user_id', user.id)
    }
  })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Pull recent inbox subjects + From headers. 30 days of inbox is enough signal.
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${thirtyDaysAgo}`,
    maxResults: 80,
  })
  const messages = listRes.data.messages ?? []

  const headerSamples: { from: string; subject: string }[] = []
  for (const m of messages) {
    if (!m.id) continue
    const meta = await gmail.users.messages.get({
      userId: 'me',
      id: m.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject'],
    })
    const headers = meta.data.payload?.headers ?? []
    const from = headers.find((h) => h.name === 'From')?.value ?? ''
    const subject = headers.find((h) => h.name === 'Subject')?.value ?? ''
    if (from) headerSamples.push({ from, subject })
  }

  // Deduplicate by sender domain+local-part to keep the prompt small.
  const seen = new Set<string>()
  const compact: { from: string; subject: string }[] = []
  for (const h of headerSamples) {
    const match = h.from.match(/<([^>]+)>/)
    const addr = (match?.[1] ?? h.from).toLowerCase()
    if (seen.has(addr)) continue
    seen.add(addr)
    compact.push(h)
  }

  const sampleBlock = compact
    .slice(0, 40)
    .map((h, i) => `${i + 1}. From: ${h.from} | Subject: ${h.subject}`)
    .join('\n')

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `You match a user's vague description to specific senders from their inbox.

User wants to watch: "${description}"

Recent senders in their inbox:
${sampleBlock}

Pick up to 5 senders that best match. For each, output a JSON object with:
- email: the email address (or domain if multiple sub-addresses, prefix with @)
- label: a short friendly name (3-5 words)
- sample_subject: one example subject line you saw
- reason: one short sentence why this matches

Reply with a JSON array only, no prose, no markdown fences. If nothing matches, reply with [].`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '[]'
  let suggestions: unknown
  try {
    suggestions = JSON.parse(stripCodeFence(text))
  } catch {
    suggestions = []
  }

  return NextResponse.json({ suggestions })
}

function stripCodeFence(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/m, '').trim()
}
