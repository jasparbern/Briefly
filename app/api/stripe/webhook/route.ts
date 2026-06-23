import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe, syncSubscriptionFromStripe } from '@/lib/stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Vercel needs the raw body to verify the Stripe signature.
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET missing' }, { status: 500 })
  }

  const h = await headers()
  const signature = h.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const payload = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (err) {
    return NextResponse.json({ error: `Bad signature: ${err instanceof Error ? err.message : 'unknown'}` }, { status: 400 })
  }

  const service = getServiceClient()

  // Idempotency: insert event_id; if it conflicts we've seen this event before.
  // Stripe retries on 5xx, and sometimes delivers the same event twice — without
  // this guard, a checkout.session.completed retry could re-fire customer creation.
  const { error: dupErr } = await service
    .from('stripe_events')
    .insert({ id: event.id, type: event.type })
  if (dupErr && (dupErr.code === '23505' || /duplicate/i.test(dupErr.message))) {
    return NextResponse.json({ received: true, deduped: true })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.supabase_user_id
      const subId = session.subscription as string | null
      if (userId && subId) {
        const sub = await stripe.subscriptions.retrieve(subId)
        const item = sub.items.data[0]
        await syncSubscriptionFromStripe({
          userId,
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          currentPeriodEnd: item.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialEnd: sub.trial_end ?? null,
        })
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      // Map customer back to a user id via our table.
      const { data } = await service
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', sub.customer)
        .maybeSingle()
      const userId = data?.user_id ?? sub.metadata?.supabase_user_id ?? null
      if (userId) {
        const item = sub.items.data[0]
        await syncSubscriptionFromStripe({
          userId,
          stripeCustomerId: sub.customer as string,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          currentPeriodEnd: item.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          trialEnd: sub.trial_end ?? null,
        })
      }
      break
    }

    default:
      // No-op for other events; we just acknowledge them.
      break
  }

  return NextResponse.json({ received: true })
}
