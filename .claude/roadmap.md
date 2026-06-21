# Briefly — Parking lot regrouped by topic

Source: `.claude/feedback-parking-lot.md` (3 rounds of user feedback) + outstanding tasks.

**These are not ordered phases.** They're buckets — work items grouped by what part of the product they touch. Pick any one when you say so.

---

## A. The digest email itself
*What lands in the user's inbox each week — content, voice, formatting, presentation.*

- **Subject line** — generate something specific each week, like `📬 Briefly — Cal Poly: 2 things due this week`, instead of the generic `Your weekly digest`.
- **Voice / tone** — rewrite the Claude prompt so it sounds like a friend texting the recap, not a system report.
- **Bullet length** — cap each bullet to ~12 words. Right now they're long and skimmable, not punchy.
- **Section structure** — Action Required + Important Updates always show. Opportunities omitted when empty. Safe to Ignore collapsed by default.
- **Empty-state copy** — replace "Nothing this week." with "None at this time." (or similar).
- **Email visual design** — branded header, better spacing, friendlier footer. (Currently looks like generic transactional email.)
- **Eval harness** — store 3-5 canned email sets so we can test prompt changes without sending real emails.

*Files involved:* `lib/ai.ts`, `lib/email.ts`

---

## B. Sender setup & management
*How users tell Briefly what to watch.*

- **AI sender suggestion** — let user type vague descriptions ("school stuff," "my Adobe Sign emails") and AI proposes matching senders from a sample of their inbox.
- **Instructions field optional** — currently required-feeling; should default to a sensible behavior when blank.
- **Inline editing** — click an existing sender to edit label + instructions without going through "delete + re-add."
- **Email transparency** — save every email Briefly processed in a `digest_emails` table; expose a "what did the AI read?" view on dashboard.
- **Per-email delete** — let user remove individual emails from Briefly's records.

*Files involved:* `app/dashboard/page.tsx`, new `/api/senders/suggest` endpoint, new DB table, `lib/gmail.ts`

---

## C. Schedule & delivery options
*When the digest goes out and where it lands.*

- **Cadence flexibility** — daily / weekly / custom (Mon/Wed/Fri etc), not just one day a week.
- **Lookback window** — let user pick: last 1 / 3 / 7 / 14 / 30 days, not hard-coded to 7.
- **Alternate delivery email** — let user receive digests at an email other than the Gmail they signed in with.
- **"Send digest now" progress UX** — current button just spins; show "Fetching emails… Summarizing… Sending…" so the first slow run doesn't feel broken.

*Files involved:* `app/dashboard/page.tsx`, `app/api/digest/route.ts`, `lib/gmail.ts`, new `users.delivery_email` column

---

## D. Web UI & visual identity
*Homepage + dashboard look and feel.*

- **Logo** — real SVG mark + wordmark. Currently using 📬 emoji.
- **Color system** — green + white (your pref). Tokenize in `app/globals.css`.
- **Typography** — pick one display font + one body font (Inter, Geist, Söhne via `next/font`).
- **Text contrast** — bump faded greys; some text is currently too low-contrast.
- **Clickable logo → home** — wrap the brand in a `<Link href="/">`.
- **Loading + empty states** on dashboard.
- **Mobile responsive pass.**

*Files involved:* `app/page.tsx`, `app/dashboard/page.tsx`, `app/globals.css`, `app/layout.tsx`, public assets

---

## E. Trust & OAuth branding
*Why does the sign-in flow look "sus" to first-time users.*

- **Google OAuth verification** — submit the app to Google's review process. Lifts the 100-test-user cap and removes "this app isn't verified" warning. Free, takes 2-6 weeks.
- **Custom domain** — once we own `briefly.app` (or similar), the OAuth URL shows that instead of `briefly-gamma-red.vercel.app`. Cleaner trust signal.
- **Email sender domain verification** in Resend → digests stop landing in Spam, from address becomes `digest@yourdomain.com`.
- **Privacy policy** page (`/privacy`) — required by Google for OAuth verification.
- **Terms of service** page (`/terms`).

*Files involved:* Google Cloud Console, domain registrar, Resend dashboard, new `app/privacy/page.tsx`, new `app/terms/page.tsx`

---

## F. Data control & compliance
*User control + legal requirements as we get real users.*

- **Delete-my-account button** — cascade delete user + all their senders, schedules, digests, processed emails.
- **Export-my-data button** — download a JSON of everything Briefly has on the user.
- **Scope lockdown** — verify Gmail scope stays at `readonly` (already does, but document it).
- **GDPR-ish data dump** — see export-my-data above.

*Files involved:* new `/api/account/delete` route, new `/api/account/export` route, dashboard settings section

---

## G. Pricing & monetization
*Money. Only worth doing after you have real users.*

- **Pricing tiers** — placeholder ideas to validate with users:
  - Free: 1 sender, weekly digest
  - Pro ($X/mo): unlimited senders, custom cadence, alternate delivery email
  - Family ($Y/mo): multi-seat
- **Stripe Checkout** + webhook to update `subscriptions` table.
- **Pricing page** at `/pricing`.
- **Feature gating** — `/api/digest` returns 402 when user exceeds their tier.
- **Free trial** — 14 days of Pro, no card needed at sign-up.

*Files involved:* new `subscriptions` table, new `/api/stripe/*` routes, new `app/pricing/page.tsx`, gating in `/api/digest/route.ts`

---

## H. Security & hardening
*Boring necessary stuff before real users.*

- **Encrypt Gmail refresh tokens at rest** in Supabase. Currently stored as plaintext.
- **Rate limit `/api/digest` POST** — Upstash or a Postgres token bucket so nobody hammers Claude on your dime.
- **Error logging** — Sentry free tier so silent failures get noticed.
- **Audit log table** — who did what when.
- **CSRF protection check** — make sure mutations require auth correctly.
- **Dependency vulnerability scan** — `npm audit`, GitHub Dependabot.

*Files involved:* `lib/gmail.ts`, `app/api/digest/route.ts`, new `lib/audit.ts`, Supabase schema, `package.json`

---

## I. Performance & cost
*Not in user feedback but worth tracking.*

- **Cache email fetches** — Gmail's API rate-limits at ~250 quota units/user/second. Cache results during a digest run.
- **Use Claude Haiku for cheap drafts**, Sonnet for the final pass. Cuts cost ~5x.
- **Vercel function regions** — pin to a single region to avoid cold-start variance.
- **Background job for digest** — current "Send digest now" blocks the HTTP request. Move to a queue (Inngest or Upstash QStash) so it returns instantly.

---

## J. Long-tail / future ideas
*Nice-to-haves, not in feedback yet.*

- Slack / Discord delivery
- iOS / Android notification (not full app)
- Multi-account Gmail (work + personal in one Briefly)
- Cross-sender deduplication (the same event in 3 emails → 1 bullet)
- "Watch this thread" — explicit pin to surface a thread regardless of sender rules
- Shareable digest links (read-only public URL)
- Weekly stats: how many emails you avoided
