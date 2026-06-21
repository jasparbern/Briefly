import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type EmailInput = {
  sender: string
  subject: string
  body: string
  instructions: string
}

export type Digest = {
  /** One-line subject for the email, generated from the content. */
  subject: string
  /** The full digest body in the bucketed format. */
  body: string
}

const FALLBACK: Digest = {
  subject: '📬 Briefly — Nothing new this week',
  body: 'No emails from your watched senders this week.',
}

export async function generateDigest(emails: EmailInput[]): Promise<Digest> {
  if (emails.length === 0) return FALLBACK

  const emailBlock = emails
    .map(
      (e, i) => `
--- Email ${i + 1} ---
From: ${e.sender}
Subject: ${e.subject}
User instructions for this sender: ${e.instructions || 'Surface anything important. Bundle noise.'}
Body:
${e.body}
`.trim()
    )
    .join('\n\n')

  const prompt = `You are Briefly. You read someone's email and write the recap a friend would text them — short, direct, no jargon. The reader is busy and skimming on their phone.

Here are this week's emails:

${emailBlock}

Write the digest in two parts.

PART 1 — SUBJECT
On the first line, output:
SUBJECT: <one short subject line>

The subject should name the most important thing this week, with a number if there are deadlines. Examples:
SUBJECT: 📬 Briefly — 2 forms due before June 30
SUBJECT: 📬 Briefly — Housing payment Sept 1, one transcript still missing
SUBJECT: 📬 Briefly — Quiet week, 1 deadline to keep on your radar

Do not write "weekly digest" or "your update". Be specific to this week's content.

PART 2 — BODY
Then a blank line, then the body. Use exactly these section headers, in this order:

🔴 Action Required
🟡 Important Updates
🟢 Opportunities
⚪ Safe to Ignore

Rules for the body:
- Always include 🔴 Action Required and 🟡 Important Updates, even if a section is empty (use "None at this time.")
- Omit 🟢 Opportunities entirely if there's nothing in it (no header, no placeholder)
- Omit ⚪ Safe to Ignore entirely if there's nothing in it
- One bullet per item, prefixed with "* "
- Each bullet: 12 words or fewer. Lead with the action or the fact. Date at the end if applicable.
- Write to the reader as "you". No "the user", no "users".
- Active voice only. No adverbs (delete words ending in -ly).
- No em dashes. Use a period or comma instead.
- No phrases like "make sure to", "be sure that", "you'll want to". State the action.
- No filler openers. No "Here are", no "Below is", no closing summary.
- Bold a number, date, or proper noun when it matters: **June 30**, **$420**, **Mira Costa High**.
- Group repeated emails into one bullet (e.g. "15 identical nudge emails from Portal" not 15 separate bullets).
- If you cannot tell from the content whether something is action or noise, default to 🟡.

Tone examples (good):
* Submit your final transcript from **Mira Costa High** by **July 1**.
* Housing locked in for **AY 2026-27**. First payment **Sept 1**.
* Decline if you don't want it. Cancellation window closes **July 19**.

Tone examples (bad — do not write like this):
* It is important to make sure that you submit your transcript in a timely manner.
* The user is reminded that housing has been confirmed for the upcoming academic year.
* You should definitely check this — it's really important!`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  if (block.type !== 'text') return FALLBACK

  return parseDigest(block.text)
}

/** Split the model output into { subject, body }. Tolerates missing SUBJECT line. */
function parseDigest(raw: string): Digest {
  const lines = raw.split('\n')
  const subjectIdx = lines.findIndex((l) => /^SUBJECT:\s*/i.test(l))

  if (subjectIdx === -1) {
    // No subject line — fall back to a default.
    return { subject: '📬 Briefly — Your digest', body: raw.trim() }
  }

  const subject = lines[subjectIdx].replace(/^SUBJECT:\s*/i, '').trim()
  const body = lines
    .slice(subjectIdx + 1)
    .join('\n')
    .replace(/^\s+/, '')

  return {
    subject: subject || '📬 Briefly — Your digest',
    body: body || raw.trim(),
  }
}

/* ----- Topic-mode filtering ----- */

export type EmailMetadata = {
  /** Stable id (Gmail message id) so the caller can map back to the full message. */
  id: string
  from: string
  subject: string
  snippet: string
  receivedAt: Date | null
}

/**
 * Given a list of email metadata and a free-text description of what the user cares about,
 * returns the subset of ids that match. Used for topic-mode streams.
 *
 * Uses Haiku for cost (this is a filter, not a creative task).
 */
export async function filterByTopic(
  emails: EmailMetadata[],
  description: string
): Promise<string[]> {
  if (emails.length === 0) return []
  const desc = description.trim()
  if (!desc) return emails.map((e) => e.id)

  // Number the emails so the model can reference them by index. Keep snippet short.
  const lines = emails
    .map((e, i) => {
      const snippet = (e.snippet ?? '').slice(0, 180).replace(/\s+/g, ' ')
      return `${i + 1}. From: ${e.from} | Subject: ${e.subject} | Snippet: ${snippet}`
    })
    .join('\n')

  const prompt = `You filter emails by topic.

User wants emails about: "${desc}"

Here are recent emails (numbered):
${lines}

Return ONLY a JSON array of the numbers (1-based) of emails that match the user's topic. Be inclusive if it's borderline — recall over precision. Reply with the array only, no prose, no markdown fences.

Examples of valid replies:
[1, 4, 7]
[]
[3]`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0]?.type === 'text' ? message.content[0].text : '[]'
  let nums: unknown
  try {
    nums = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/m, '').trim())
  } catch {
    return []
  }
  if (!Array.isArray(nums)) return []

  const picked = new Set<string>()
  for (const n of nums) {
    const idx = Number(n) - 1
    if (Number.isInteger(idx) && idx >= 0 && idx < emails.length) {
      picked.add(emails[idx].id)
    }
  }
  return Array.from(picked)
}

