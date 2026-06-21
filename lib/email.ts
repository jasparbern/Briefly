import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendDigestEmail(to: string, digestText: string): Promise<void> {
  // Convert plain text digest to simple HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #111; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 24px; }
  .section { margin-bottom: 24px; }
  .section-title { font-weight: 700; font-size: 15px; margin-bottom: 10px; }
  .red { color: #dc2626; }
  .amber { color: #d97706; }
  .green { color: #16a34a; }
  .gray { color: #9ca3af; }
  ul { margin: 0; padding-left: 20px; }
  li { margin-bottom: 6px; font-size: 14px; line-height: 1.5; }
  .section-empty { margin: 0; font-size: 14px; color: #6b7280; font-style: italic; }
  strong { font-weight: 600; }
  .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
</style>
</head>
<body>
<h1>📬 Briefly — Your Weekly Digest</h1>
${convertToHtml(digestText)}
<div class="footer">
  You're receiving this because you set up Briefly. To unsubscribe or change settings, visit your dashboard.
</div>
</body>
</html>`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `📬 Briefly — Your weekly digest`,
    html,
    text: digestText,
  })
}

function convertToHtml(text: string): string {
  const sectionColors: Record<string, string> = {
    '🔴': 'red',
    '🟡': 'amber',
    '🟢': 'green',
    '⚪': 'gray',
  }

  // Escape HTML, then re-apply **bold** as <strong>.
  function inlineFormat(s: string): string {
    const escaped = s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
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

    // Emojis are surrogate pairs in UTF-16 — first 2 code units = the emoji char
    const emoji = trimmed.slice(0, 2)
    const color = sectionColors[emoji]

    if (color) {
      closeSection()
      // Strip markdown bold + the leading emoji+space, then use the rest as title
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
      // Plain paragraph text inside a section (e.g. "Nothing this week.")
      closeList()
      html += `<p class="section-empty">${inlineFormat(trimmed)}</p>`
    }
  }

  closeSection()
  return html
}
