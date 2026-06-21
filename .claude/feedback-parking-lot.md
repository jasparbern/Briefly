# Feedback parking lot (do not act on without explicit user request)

Round 1 (after first session):
- Home button doesn't work (clickable logo)
- Bad text contrast in places
- Digest cadence: more than once a week, user-chosen frequency
- Sender selection: don't require pasting emails — AI figures out from vague description; editable later
- AI should save every email it processed; user can view + delete
- Gmail OAuth flow URL looks sus — needs proper brand/verification
- Looks vibe-coded — needs real logo + visual identity

Round 2 (after first successful test):
- Let user pick how many days the digest covers (not just 7)
- "Send digest now" first run might take a while — needs better loading state / progress
- Allow user to add a different email (not just their Gmail) to receive digests
- Color scheme: green and white
- Adding context (instructions) for senders should be optional
- Font needs to change
- Overall aesthetics need work
- Pricing: think through tiers
- Payment page + free trial
- Cybersecurity hardening

Round 4 (architectural — major):
- Don't be sender-focused. Let users filter on content/topic too, not just sender.
- Multiple independent "streams" per user is the DEFAULT — not a Pro feature.
  - Each stream has its own filter rules, cadence, lookback, delivery email
  - Example: "school stuff" weekly + "packages" daily as two separate digests
  - They should NOT merge into one email
- Implies data model refactor: User → many Streams (each with senders/rules + schedule + digests)

Round 3 (after first real digest landed):
- Email subject needs work (more specific than "Your weekly digest")
- Email formatting overall feels lifeless — punchier copy, headlines that pull you in
- Section structure too rigid: Action + Important should always show; Opportunities optional; Safe to Ignore could collapse
- Empty sections should say "None at this time" (or similar), not blank or "Nothing this week."
- Bullets too long — write tight, scannable; the goal is "I want to read this"
- Tone shift needed: this should feel like a friend's text, not a system report