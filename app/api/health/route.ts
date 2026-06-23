import { NextResponse } from 'next/server'

// GET /api/health — quick liveness check. Does NOT touch external services,
// since we don't want a Supabase outage to fail Vercel's healthcheck.
// Use the inspector or a separate /api/status route for deep checks.
export async function GET() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
    'RESEND_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID_PRO',
    'CRON_SECRET',
    'NEXT_PUBLIC_APP_URL',
  ]
  const missing = required.filter((k) => !process.env[k])

  return NextResponse.json(
    {
      ok: missing.length === 0,
      service: 'abridgly',
      env: process.env.VERCEL_ENV ?? 'unknown',
      missing_env: missing,
      now: new Date().toISOString(),
    },
    { status: missing.length === 0 ? 200 : 500 }
  )
}
