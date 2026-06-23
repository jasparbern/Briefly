import { Resend } from 'resend'
import type { Digest } from './ai'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendDigestEmail(to: string, digest: Digest): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #111; line-height: 1.5; }
  .preheader { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  .section { margin-bottom: 22px; }
  .section-title { font-weight: 700; font-size: 15px; margin-bottom: 8px; }
  .red { color: #dc2626; }
  .amber { color: #d97706; }
  .green { color: #16a34a; }
  .gray { color: #6b7280; }
  ul { margin: 0; padding-left: 20px; }
  li { margin-bottom: 5px; font-size: 14px; line-height: 1.55; }
  .section-empty { margin: 0; font-size: 14px; color: #9ca3af; font-style: italic; }
  strong { font-weight: 600; }
  .footer { margin-top: 36px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 14px; }
  .footer a { color: #6b7280; }
</style>
</head>
<body>
<p class="preheader">${escapeHtml(digest.subject)}</p>
${convertToHtml(digest.body)}
<div class="footer">
  You set up Abridgly to send this. Adjust senders, cadence, or pause delivery in your <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard">dashboard</a>.
</div>
</body>
</html>`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://abridgly.com'

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: digest.subject,
    html,
    text: `${digest.subject}\n\n${digest.body}`,
    headers: {
      // Gmail / Outlook show a native "Unsubscribe" link when these headers are
      // present. Improves deliverability + reduces spam reports.
      'List-Unsubscribe': `<${appUrl}/dashboard>, <mailto:jasparbbernstein@gmail.com?subject=Unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineFormat(s: string): string {
  return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function convertToHtml(text: string): string {
  const sectionColors: Record<string, string> = {
    '🔴': 'red',
    '🟡': 'amber',
    '🟢': 'green',
    '⚪': 'gray',
  }

  const lines = text.split('\n')
  let html = ''
  let inSection = false
  let listOpen = false

  function closeList() {
    if (listOpen) {
      html += '</ul>'
      listOpen = false
    }
  }

  function closeSection() {
    closeList()
    if (inSection) {
      html += '</div>'
      inSection = false
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      closeList()
      continue
    }

    // Emojis are UTF-16 surrogate pairs; first 2 code units = the emoji char.
    const emoji = trimmed.slice(0, 2)
    const color = sectionColors[emoji]

    if (color) {
      closeSection()
      const titleText = trimmed.slice(2).replace(/^\s*/, '').replace(/\*\*/g, '')
      html += `<div class="section"><p class="section-title ${color}">${emoji} ${inlineFormat(titleText)}</p>`
      inSection = true
    } else if (/^[*•\-]\s/.test(trimmed)) {
      if (!listOpen) {
        html += '<ul>'
        listOpen = true
      }
      const content = trimmed.replace(/^[*•\-]\s*/, '')
      html += `<li>${inlineFormat(content)}</li>`
    } else if (inSection) {
      closeList()
      html += `<p class="section-empty">${inlineFormat(trimmed)}</p>`
    }
  }

  closeSection()
  return html
}
