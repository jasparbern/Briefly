# Stripe setup — fill these env vars before going live

Until these are filled, the `/pricing` page renders but the "Start trial"
button returns a 500 error.

## 1. Create the Stripe account

- Sign up at https://dashboard.stripe.com/register
- Use your business email. Keep your account in test mode while we wire things up.

## 2. Create the Pro product

- Stripe dashboard → **Products** → **+ Add product**
- Name: `Briefly Pro`
- Pricing model: **Recurring**, monthly, **$5.00 USD** (or whatever you settle on)
- Click **Save product**
- On the resulting page, copy the **Price ID** (looks like `price_1Q...`)

## 3. Get API keys (test mode first)

- Stripe dashboard → **Developers → API keys**
- Copy:
  - **Publishable key** (`pk_test_...`)
  - **Secret key** (`sk_test_...`)

## 4. Set up the webhook

- Stripe dashboard → **Developers → Webhooks → Add endpoint**
- Endpoint URL: `https://YOUR_DOMAIN/api/stripe/webhook` (or your `briefly-gamma-red.vercel.app` URL for testing)
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Click **Add endpoint**, then click **Reveal** under "Signing secret" and copy it (starts with `whsec_`)

## 5. Fill these env vars

Locally in `.env.local`, and in Vercel project settings:

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
```

## 6. Local webhook testing

- Install the Stripe CLI: https://stripe.com/docs/stripe-cli
- Run: `stripe login`
- Forward locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- In a second terminal, run `npm run dev`
- Trigger a fake event: `stripe trigger checkout.session.completed`

## 7. Going live

- Stripe dashboard → top-right toggle → **Live mode**
- Re-do steps 2-4 in live mode (live products + live API keys + live webhook)
- Update the env vars in Vercel to the live keys
- Test one real $5 charge on yourself before announcing

## Current tier limits (configurable in `lib/stripe.ts`)

| Limit | Free | Pro |
|---|---|---|
| Streams | 1 | 50 |
| Senders per stream | 5 | 100 |
| Cadence | weekly only | daily, weekly, custom |
| Alternate delivery email | no | yes |
| Trial | n/a | 14 days |
