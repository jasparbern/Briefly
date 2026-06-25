import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { encrypt } from '@/lib/crypto'

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/gmail/callback`
  )
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/dashboard?error=gmail_auth`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/?error=not_logged_in`)
  }

  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)

  // Encrypt tokens at rest (AES-256-GCM). Never store them as plaintext.
  await supabase.from('gmail_tokens').upsert({
    user_id: user.id,
    access_token: encrypt(tokens.access_token!),
    refresh_token: encrypt(tokens.refresh_token!),
    expiry_date: tokens.expiry_date,
  })

  return NextResponse.redirect(`${origin}/dashboard?gmail=connected`)
}
