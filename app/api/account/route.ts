import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// DELETE /api/account
// Wipes the user's data and their auth account.
// FK cascade handles streams → senders, digests, digest_emails, gmail_tokens, digest_schedule.
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const service = getServiceClient()
  // Wipe domain rows first in case cascades miss anything (defensive).
  await Promise.allSettled([
    service.from('gmail_tokens').delete().eq('user_id', user.id),
    service.from('digest_emails').delete().eq('user_id', user.id),
    service.from('digests').delete().eq('user_id', user.id),
    service.from('senders').delete().eq('user_id', user.id),
    service.from('streams').delete().eq('user_id', user.id),
    service.from('digest_schedule').delete().eq('user_id', user.id),
  ])

  // Delete the auth user. Requires service-role.
  const { error } = await service.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
