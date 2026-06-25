import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Abridgly — Your week of email, in one read'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="64" height="64" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="40" stroke="#10241b" strokeWidth="6" />
            <line x1="50" y1="12" x2="50" y2="19" stroke="#10241b" strokeWidth="5" strokeLinecap="round" />
            <line x1="88" y1="50" x2="81" y2="50" stroke="#10241b" strokeWidth="5" strokeLinecap="round" />
            <line x1="50" y1="88" x2="50" y2="81" stroke="#10241b" strokeWidth="5" strokeLinecap="round" />
            <line x1="12" y1="50" x2="19" y2="50" stroke="#10241b" strokeWidth="5" strokeLinecap="round" />
            <path d="M32 74 L50 42 L68 74 M39 62 L61 62" stroke="#047857" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em', color: '#047857' }}>bridgly</span>
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
