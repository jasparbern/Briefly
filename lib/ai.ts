import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type EmailInput = {
  sender: string
  subject: string
  body: string
  instructions: string
}

export async function generateDigest(emails: EmailInput[]): Promise<string> {
  if (emails.length === 0) {
    return 'No emails from your watched senders this week.'
  }

  const emailBlock = emails
    .map(
      (e, i) => `
--- Email ${i + 1} ---
From: ${e.sender}
Subject: ${e.subject}
User instructions for this sender: ${e.instructions || 'Summarize anything important'}
Body:
${e.body}
`.trim()
    )
    .join('\n\n')

  const prompt = `You are Briefly, an AI that reads emails and creates a clean weekly digest for busy people.

Here are the emails from this week:

${emailBlock}

Create a digest organized into exactly these four sections. Use the exact emoji headers below.

🔴 Action Required
List anything that requires the user to DO something: forms to submit, deadlines, responses needed, payments due. Be specific — include dates and what to do.

🟡 Important Updates
Significant information the user should know: schedule changes, confirmations, announcements, results.

🟢 Opportunities
Optional but potentially valuable things: events, programs, offers, sign-ups.

⚪ Safe to Ignore
Stuff that's noise: marketing emails, duplicates, already-done confirmations, out-of-office replies, generic newsletters.

Rules:
- Each bullet point should be one concise sentence. Include dates when they appear in the email.
- If a section has nothing, write "Nothing this week." under it.
- Do NOT include any intro or outro text outside the four sections.
- Do NOT mention email subjects or senders by name, just the content.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const block = message.content[0]
  return block.type === 'text' ? block.text : 'Could not generate digest.'
}
