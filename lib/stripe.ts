import Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder', {
  apiVersion: '2026-05-27.dahlia',
})

export type Tier = 'free' | 'pro'

export type TierLimits = {
  maxStreams: number
  maxSendersPerStream: number
  /** Cadences allowed for this tier. */
  allowedCadences: ('daily' | 'weekly' | 'custom')[]
  /** Whether the user can send digests to a non-Gmail email. */
  alternateDeliveryEmail: boolean
}

export const LIMITS: Record<Tier, TierLimits> = {
  free: {
    maxStreams: 1,
    maxSendersPerStream: 5,
    allowedCadences: ['weekly'],
    alternateDeliveryEmail: false,
  },
  pro: {
    // 5-stream cap keeps margins positive on heavy users while still
    // covering >95% of real use cases (a couple of kids + work + packages).
    maxStreams: 5,
    maxSendersPerStream: 25,
    allowedCadences: ['daily', 'weekly', 'custom'],
    alternateDeliveryEmail: true,
  },
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Returns the user's tier, treating trialing subscriptions as 'pro'. */
export async function getUserTier(userId: string): Promise<Tier> {
  const service = getServiceClient()
  const { data } = await service
    .from('subscriptions')
    .select('tier, status, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return 'free'

  if (data.tier === 'pro' && (data.status === 'active' || data.status === 'trialing')) {
    return 'pro'
  }
  return 'free'
}

export async function getUserLimits(userId: string): Promise<TierLimits> {
  const tier = await getUserTier(userId)
  return LIMITS[tier]
}

/**
 * Idempotent. Upserts a row in `subscriptions` for the given user with the
 * fields derived from a Stripe Subscription. Used by webhook + checkout return.
 */
export async function syncSubscriptionFromStripe(params: {
  userId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: Stripe.Subscription.Status
  currentPeriodEnd: number
  cancelAtPeriodEnd: boolean
  trialEnd: number | null
}) {
  const tier: Tier = ['active', 'trialing'].includes(params.status) ? 'pro' : 'free'
  const service = getServiceClient()
  await service.from('subscriptions').upsert(
    {
      user_id: params.userId,
      tier,
      status: params.status,
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      current_period_end: new Date(params.currentPeriodEnd * 1000).toISOString(),
      cancel_at_period_end: params.cancelAtPeriodEnd,
      trial_ends_at: params.trialEnd ? new Date(params.trialEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
}
