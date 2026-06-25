import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const alt = 'Abridgly — Your week of email, in one read'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logo = await readFile(join(process.cwd(), 'public', 'logo.png'))
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #ffffff 0%, #ecfdf5 60%, #ffffff 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
          fontFamily: 'sans-serif',
          color: '#0c1f17',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="Abridgly" height={84} />
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 92, lineHeight: 1.02, letterSpacing: '-0.03em', fontWeight: 600 }}>
            Your week of email,
          </div>
          <div style={{ fontSize: 92, lineHeight: 1.02, letterSpacing: '-0.03em', fontWeight: 600, fontStyle: 'italic', color: '#047857' }}>
            summed up for you.
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: '#2f3a35', maxWidth: 880 }}>
            Pick who matters. Skip the rest. One clean recap, on your schedule.
          </div>
        </div>
      </div>
    ),
    size
  )
}
