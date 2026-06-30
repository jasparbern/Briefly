# Google OAuth Verification — Abridgly

Project: `briefly-500103` · Domain: abridgly.com · Scope: `gmail.readonly` (restricted)

This is the prep pack for getting the app verified so users stop seeing the
"Google hasn't verified this app" warning and the 100-user cap is lifted.

---

## Current status (as of this session)

| Item | Status |
|---|---|
| Publishing status | **In production**, External, **unverified**, 2 / 100 user cap |
| App name / support email / dev contact | ✅ done (Abridgly / jasparbbernstein@gmail.com) |
| Home / Privacy / Terms links | ✅ done (abridgly.com, /privacy, /terms) |
| Authorized domains | ✅ abridgly.com, bwypsygtxiwnnmhkczut.supabase.co, briefly-gamma-red.vercel.app |
| Domain ownership (Search Console) | ✅ verified (abridgly.com accepted as authorized domain) |
| **App logo on consent screen** | ❌ **TODO — upload `public/icon-mark.png`** |
| **`gmail.readonly` declared on Data Access page** | ❌ TODO (requested at runtime but not declared) |
| **Demo video (YouTube)** | ❌ TODO — script below |
| **CASA security assessment** | ❌ TODO — costs money, do only when ready to launch publicly |

The app already works **today** for up to 100 users in unverified mode; they
just click through one warning. Verification (incl. CASA) only becomes worth
paying for once there's real usage.

> ⚠️ Do **not** switch the app to "Testing" mode. In Testing mode Google expires
> the Gmail refresh token after 7 days, which would silently break the scheduled
> digests. Production + unverified is the correct free state.

---

## Scope justification (paste into the verification form)

> Abridgly requests **only** the `gmail.readonly` scope. When a user connects
> their Gmail, Abridgly reads messages from the senders and topics the user
> explicitly chooses, extracts the items that need attention (deadlines,
> payments, forms to sign, schedule changes), and emails the user a single
> concise summary on their chosen schedule (daily or weekly).
>
> We request read-only access because the product's only function is to read and
> summarize mail. Abridgly never sends, modifies, labels, archives, or deletes
> mail, so no write scopes are requested. `gmail.readonly` is the minimum scope
> required — a metadata-only scope is insufficient because the summaries are
> generated from message content.
>
> Source emails are processed in memory and discarded the moment the digest is
> sent; we never store the sender, subject, body, or a preview. We retain only
> the user's settings and the digests we generated. Email data is never sold and
> never used to train AI models.

---

## Demo video script (record screen + voiceover, upload unlisted to YouTube)

Google's reviewers need to see: your homepage, the OAuth consent screen with the
scope, the client ID in the consent URL, and how the data is used. Keep it ~2 min.

1. **Homepage** — open `https://abridgly.com`. Say: "This is Abridgly, an email
   summarizing service at abridgly.com."
2. **Start sign-in** — click *Start free* / *Sign in with Google*.
3. **Consent screen** — when Google's consent screen appears, slow down and:
   - Read the requested permission aloud: "Abridgly is requesting read-only
     access to Gmail (`gmail.readonly`)."
   - Point out the **client ID** visible in the browser's address bar so the
     reviewer can confirm it matches project `briefly-500103`.
4. **Grant** — approve and return to the dashboard.
5. **Show the use** — create a stream, pick a couple of senders, and trigger a
   digest (or open a digest email you already received). Say: "Abridgly reads
   only the chosen senders and emails back one short summary."
6. **State the privacy posture** — "Access is read-only. Emails are never stored,
   never sold, and never used to train AI. We only keep the summary and the
   user's settings."

---

## Manual steps remaining (who does what)

**You (Jaspar):**
- [ ] Upload the consent-screen logo: Google Auth Platform → Branding → App logo →
      Browse → choose `C:\Users\jaspa\briefly\public\icon-mark.png` → Save.
- [ ] Record + upload the demo video (script above), get the YouTube link.
- [ ] When ready to launch publicly: pay for the cheapest CASA tier (self-scan
      first) and click **Submit for verification**.

**Claude can do (when the console isn't throttling automated access):**
- [ ] Declare `gmail.readonly` on the Data Access page (Add or remove scopes).
- [ ] Pre-fill the verification submission form with the justification above.

**Possible reviewer follow-up:**
- The `*.supabase.co` redirect domain (Supabase hosted auth) may draw a question
  during review. If Google pushes back, the fix is a Supabase Custom Domain
  (~$10/mo) so auth runs on `auth.abridgly.com`. Don't pre-emptively buy it.
