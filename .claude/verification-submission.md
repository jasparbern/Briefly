# Google OAuth verification — submission text

Paste these into the Google OAuth verification form fields when you're ready to submit.
Submit from: https://console.cloud.google.com/auth/verification-center?project=briefly-500103

You'll need a custom domain first. The app homepage URL, privacy URL, and terms URL must all live on the same verified domain. Vercel `.vercel.app` subdomains are not accepted for verification.

---

## App home page URL
`https://YOUR_DOMAIN`

## Privacy policy URL
`https://YOUR_DOMAIN/privacy`

## Terms of service URL
`https://YOUR_DOMAIN/terms`

## Application type
Web application

## Authorized domains
- `YOUR_DOMAIN` (only one needed; subdomains are inferred)

---

## App description (shown on consent screen)

Abridgly reads emails from senders the user selects, sends those emails to an AI to generate a recap, and delivers the recap to the user's inbox on the schedule they choose (daily, weekly, or custom). The goal is to surface deadlines, payments, and important updates without making the user dig through their inbox.

---

## Why does your app need each requested scope?

### `https://www.googleapis.com/auth/gmail.readonly`

Abridgly needs to read message contents from the senders the user has explicitly added to their watchlist so the AI can generate a summary. Only emails from sender addresses or domains the user has chosen are pulled. Abridgly never reads other mail, never sends mail as the user, and never modifies or deletes mail. We do not store full message bodies long-term — only the subject, snippet, and sender for the "what did the AI read?" view, which the user can delete from at any time.

### `https://www.googleapis.com/auth/userinfo.email`

Used at sign-in to associate the user's account with their email address so we know where to deliver their digest.

### `openid` / `profile` (if requested)

Standard OpenID Connect for basic identity at sign-in.

---

## How will Google API data be used / improve user experience?

Gmail API data is used exclusively to:
1. Locate messages matching the user's watched senders within a user-chosen lookback window (1-30 days).
2. Pass the contents to our AI provider so it can generate a recap.
3. Display the list of emails Abridgly read for transparency in the user's dashboard.

This data is not used for advertising, sold to third parties, or used to train AI models.

---

## Demo video

Required: a 2-3 minute screencast on YouTube (unlisted is fine). Script:

1. **(0:00-0:15)** Open the home page at YOUR_DOMAIN. Mention what Abridgly does in one sentence.
2. **(0:15-0:45)** Click "Get started with Google." Show the Google OAuth consent screen, including the requested `gmail.readonly` scope. Approve it. Land on the dashboard.
3. **(0:45-1:15)** Click "Connect Gmail." Show the second consent screen for `gmail.readonly`. Approve. Show "✓ Connected" state.
4. **(1:15-1:45)** Create a stream named "School." Add a sender (e.g. `@calpoly.edu`). Show optional instructions field.
5. **(1:45-2:15)** Click "Send digest now." Wait for the digest email to arrive. Open it. Show the bucketed summary (Action Required / Important Updates / etc).
6. **(2:15-2:45)** Open "What did the AI read?" — show the list of processed emails. Delete one to show the per-email delete control.
7. **(2:45-3:00)** Go to Account → "Delete my account" (don't click through). Mention that this wipes all data.

Voiceover script outline (read aloud during recording):
- "Abridgly is a weekly email digest service. Users pick senders they care about, and we send a recap once a day, week, or custom days."
- "On sign-in, we request the `gmail.readonly` scope. This is the minimum needed to read message contents from the senders the user adds."
- "Inside the app, the user creates streams. Each stream has its own senders, schedule, and delivery email. They can mix and match — different streams for different topics."
- "We only read mail from senders the user adds, within a window they pick. We never send mail, modify mail, or read mail from senders they haven't added."
- "Every email we process is shown in 'What did the AI read?' so users can verify exactly what Abridgly accessed. Users can delete individual emails from this record."
- "Users can export everything we have on them, or delete their account entirely, from the Account section."

---

## How will Google API data be stored, secured, and accessed?

- All data lives in Supabase (Postgres), hosted on AWS us-east-1.
- Gmail refresh tokens are encrypted at rest. Access tokens are short-lived.
- Row-level security policies in Supabase ensure each user can only read/write their own rows.
- The service-role key is only used on server-side Vercel functions, never exposed to the browser.
- Only the founder (jasparbbernstein@gmail.com) has access to the Supabase project.
- The Gmail body content is held only in memory during digest generation and is not persisted. We persist subject, sender, and snippet (the first ~140 chars) so users can see what the AI saw.

---

## Will you retain Google data after the user revokes access?

No. When a user:
- Clicks "Delete my account" in the dashboard → all their rows are wiped within 24 hours.
- Revokes Abridgly's access at myaccount.google.com/permissions → their Gmail tokens become invalid immediately; we cannot fetch new mail. Their existing data in our database persists until they also delete their account.

We are happy to add automatic data deletion on revocation if Google requires it.

---

## Brand verification (logo)

We will upload a 120x120 PNG logo on the OAuth consent screen branding page.

---

## Restricted scope justification (specifically for gmail.readonly)

Abridgly's entire value proposition is reading the user's email to summarize it. We cannot provide the service without `gmail.readonly`. We use the narrowest read-only scope available; we do not request `gmail.modify`, `gmail.compose`, `gmail.send`, or `gmail.labels` because we don't need to write to the user's mailbox.

Abridgly is a "User Productivity" use case under Google's API Services User Data Policy.

---

## Contact info Google may use to reach you

- Email: jasparbbernstein@gmail.com
- App support page: `https://YOUR_DOMAIN` (the home page itself has an email contact)

---

## Notes for the verification reviewer

- The product is in early access. We currently have under 10 users.
- We do not yet have a Workspace organization; this is a personal-developer-account project intended to grow into a published consumer service.
- We follow the Limited Use policy: Gmail data is used only to provide the user-facing recap feature, is not transferred to others except as needed for that feature, and is not used for advertising or to train AI models.

---

## Pre-submission checklist

Before you click "Submit for verification" in the Google Cloud console:

- [ ] Custom domain registered and pointed at Vercel
- [ ] `/privacy` page reachable on that domain
- [ ] `/terms` page reachable on that domain
- [ ] Home page reachable on that domain with a clear product description
- [ ] OAuth client redirect URIs updated to use the new domain
- [ ] Supabase Site URL + redirect allowlist updated to use the new domain
- [ ] `NEXT_PUBLIC_APP_URL` in Vercel env vars set to the new domain
- [ ] Domain verified in Google Search Console (https://search.google.com/search-console)
- [ ] Logo uploaded in Branding section
- [ ] Demo video recorded and uploaded as Unlisted on YouTube
- [ ] All the prose above pasted into the verification form fields

Expected review time: 2-6 weeks.
