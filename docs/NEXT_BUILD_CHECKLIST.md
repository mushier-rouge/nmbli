# Next Build Checklist

**Purpose:** Small, high-leverage improvements to ship now.

- Dealer invite lifecycle & SLA nudges: expire/extend tokens, rotate on resend, auto-nudge at T+24h/T+44h, timeline logs.
- Offer clarity “Where your money goes”: show tax basis ZIP + rate; doc/DMV typical ranges; chips for Buyer-approved vs Dealer add-ons.
- One-click CSV/PDF export of accepted deal + timeline.
- ToS/Privacy/Disclosures: SMS/email consent copy; dealer form checkboxes (“OTD itemization required”, “no unapproved add-ons”, “hard-pull policy”).
- Dealer notes & “advertised price honored” flag: adjust shadiness score; show notes in timeline.
- Rate limiting & captcha fallback on public POSTs.
- Ops Quick-Fix panel (merge duplicate fees; mark add-on optional; recompute totals; “TTL estimated” badge).
- Dealer leaderboard (internal) by response time, contract pass rate, add-on frequency.
- Notifications v1 (email to buyer for quote/counter/contract ready; optional SMS if consented).
- Guided onboarding overlays (Buyer & Dealer).
- Acceptance for each item: visible UI, persisted state, timeline event where relevant, and at least one Playwright test.
