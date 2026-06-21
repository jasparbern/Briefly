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

  const lines = text.split('\n')
  let html = ''
  let inSection = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inSection) html += '</ul>'
      inSection = false
      continue
    }

    const emoji = trimmed[0] + trimmed[1]
    const color = sectionColors[emoji]

    if (color) {
      if (inSection) html += '</ul>'
      html += `<div class="section"><p class="section-title ${color}">${trimmed}</p><ul>`
      inSection = true
    } else if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const content = trimmed.replace(/^[•\-]\s*/, '')
      html += `<li>${content}</li>`
    } else if (inSection) {
      html += `<li>${trimmed}</li>`
    }
  }

  if (inSection) html += '</ul></div>'

  return html
}
