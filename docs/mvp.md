# OutTheDoor MVP — Build Instructions for a Coding LLM

You are a senior full‑stack engineer. Build a **mobile‑first web app (PWA)** called **OutTheDoor** that helps buyers collect **itemized out‑the‑door (OTD) quotes** from car dealers, compare them, send simple counters, and block e‑signing if the final contract doesn’t match the accepted quote. Include a **dealer mini‑portal** for submitting/updating quotes and uploading PDFs. Optimize for fast MVP delivery, reliability, and a calm, transparent UI.

---

## Architecture & Tech Stack

**Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod.

**Backend (same monorepo):** Next.js API routes/Server Actions, PostgreSQL (Supabase), Prisma (or Supabase client), Supabase Storage, background jobs (Supabase Queues or BullMQ + Upstash/Redis), transactional email (Resend/SendGrid). DocuSign integration (stub-friendly: webhooks + envelope status).

**Auth:** Passwordless magic‑link via email. Roles: `buyer`, `dealer`, `ops`. Use Supabase Auth + Row Level Security (RLS).

**PWA:** Installable, offline shell, optional web push later.

**Non‑Goals for MVP:** Financing origination, trade‑in valuation, delivery logistics, complex OCR/ML; keep doc parsing human‑assisted.

---

## Milestones (deliver in order)

### M1 — Project Scaffold & Core Entities

* Init Next.js + Tailwind + shadcn/ui + Prisma.
* Create DB models: `User`, `Brief`, `Dealer`, `DealerInvite`, `Quote`, `QuoteLine`, `Contract`, `TimelineEvent`, `FileAsset`.
* Seed: 3 dealers, 1 buyer, 1 brief.

### M2 — Auth & Roles (Magic Links)

* Email magic‑link login with expiring one‑time tokens.
* Session stores role + scoped access.
* Dev‑only: ops “impersonate dealer” toggle.

### M3 — Buyer Intake (“Brief”)

* Page: Create Brief (new/used, makes/models, trim flex, colors, must‑haves, ZIP, **max OTD**, payment type, timeline).
* On save → Buyer Timeline (status chips: Sourcing → Offers → Negotiation → Contract → Done) with a pinned Brief card.

### M4 — Dealer Outreach (Invites)

* Ops UI: select brief → choose dealers → send invites.
* Email template: brief summary + **unique secure magic link** to Dealer Quote Form.
* `DealerInvite` state machine: `sent` → `viewed` → `submitted` → `revised` → `expired`.

### M5 — Dealer Quote Form (No Login; Token‑Gated)

Required fields unless noted:

* Vehicle: VIN/Stock #, year/make/model/trim, colors, ETA.
* Pricing: MSRP, **dealer_discount**, itemized **incentives[] {name, amount}**, **doc_fee**, **dmv/registration**, **tire/battery**, **other_fees[]**, **addons[] {name, amount, is_optional=false}**, **tax_rate**, **tax_amount**, **OTD_total**.
* Payment terms (optional): cash/finance/lease, APR/MF, term, DAS.
* Uploads: quote PDF (Buyer’s Order), supporting files.
* Confirmations: “No unapproved add‑ons,” “Incentives eligible for buyer ZIP,” “OTD includes all fees.”
* Submit → create `Quote` (status `published`) + `QuoteLine` children, store files, emit `TimelineEvent`.

### M6 — Email Ingestion (Fallback)

* Webhook endpoint to receive dealer emails + attachments; create draft `Quote` with files; route to Ops Review.

### M7 — Ops Review (Human‑in‑the‑Loop Normalizer)

* Screen to open draft Quote, key missing amounts, set `confidence` (0–1), publish.
* Publishing locks normalized schema and tags source (`dealer_form` | `email_parsed`).

### M8 — Offers Board (Buyer)

* Grid of best quotes (2–4): columns = OTD, ETA, Doc fee, DMV, Incentives total, **Add‑ons chips**, distance(optional), **Shadiness badge**.
* Drawer: line‑item breakdown (“Where your money goes”) + original files.
* Badges: **Lowest**, **Cleanest** (no add‑ons), **Fastest** (soonest ETA).
* Actions: **Accept**, **Counter…**, **Hide**.

### M9 — Counter Templates (Rules‑Based)

* Two counters:

  1. Remove add‑ons: list addon names/amounts; confirm OTD unchanged.
  2. Match target OTD: supplied value, zero add‑ons.
* Send via email; update `Negotiation` log (store in `TimelineEvent`). Dealer revises via same tokened form → create new `Quote` version (link to `parentQuoteId`).

### M10 — Contract Guardrail

* Dealer uploads final contract PDF or triggers DocuSign envelope (stub is fine).
* Auto‑diff against **accepted Quote** (rules below). Block e‑sign until green or explicit buyer override with reason.

### M11 — Timeline & Export

* Timeline events: Brief created, Dealer invited, Quote submitted, Counter sent, Quote revised, Contract uploaded, Guardrail pass/fail, Completed.
* Export timeline as single PDF (server‑rendered HTML→PDF) including accepted quote breakdown.

### M12 — PWA & Polish

* Manifest, icons, offline shell, install prompt.
* Optional: web push for key events (quote received, revised, contract ready).

---

## Data Model (implement with Prisma; exact fields matter)

**User**: id, email(unique), role(`buyer`|`dealer`|`ops`), name, createdAt

**Brief**: id, buyerId→User, status(`sourcing`|`offers`|`negotiation`|`contract`|`done`), zipcode, paymentType(`cash`|`finance`|`lease`), maxOTD, makes[], models[], trims[], colors[], mustHaves[], timelinePreference, createdAt, updatedAt

**Dealer**: id, name, city, state, contactName, contactEmail, phone

**DealerInvite**: id, briefId, dealerId, magicLinkToken, state(`sent`|`viewed`|`submitted`|`revised`|`expired`), expiresAt, lastViewedAt

**Quote**: id, briefId, dealerId, inviteId, status(`draft`|`published`|`superseded`|`accepted`|`rejected`), vin, stockNumber, year, make, model, trim, extColor, intColor, etaDate, msrp, dealerDiscount, docFee, dmvFee, tireBatteryFee, otherFeesTotal, incentivesTotal, addonsTotal, taxRate, taxAmount, otdTotal, paymentType, aprOrMf, termMonths, dasAmount, evidenceNote, confidence(0–1), source(`dealer_form`|`email_parsed`), parentQuoteId, createdAt

**QuoteLine**: id, quoteId, kind(`incentive`|`addon`|`fee`), name, amount, approvedByBuyer(bool default false)

**Contract**: id, quoteId(accepted), status(`uploaded`|`checked_ok`|`mismatch`), checks(jsonb), envelopeId(optional), files→FileAsset[]

**TimelineEvent**: id, briefId, type, actor(`buyer`|`dealer`|`ops`|`system`), payload(jsonb), createdAt

**FileAsset**: id, ownerType(`quote`|`contract`|`timeline`), ownerId, url, mimeType, originalName, size

---

## API Surface (JSON; secure via session/role or invite token)

`POST /api/auth/magic-link` → { email, roleHint? } → sends link.
`GET /api/auth/callback?token=...` → verifies token → sets session → redirect.

`POST /api/briefs` (buyer) → create brief → { brief }.
`GET /api/briefs/:id` (buyer owner or ops) → brief + quotes + timeline.
`POST /api/briefs/:id/invite-dealers` (ops) → { dealerIds[] } → invites + emails.

`GET /api/dealer-invite/:token` (public, tokened) → brief summary + form schema.
`POST /api/dealer-invite/:token/quote` (public, tokened, multipart) → create/update published Quote; returns { quoteId }.

`POST /api/quotes/:id/counter` (buyer/ops) → { type: 'remove_addons' | 'match_target', targetOTD?, addonNames?[] } → emails dealer + timeline entry.
`POST /api/quotes/:id/accept` (buyer) → set quote `accepted`; brief.status → `contract`.

`POST /api/contracts/upload` (dealer via invite or ops) → { quoteId } + files → store + enqueue diff.
`POST /api/contracts/:id/check` (ops/system) → run diff → return checklist.

`GET /api/timeline/:briefId` (buyer owner/ops) → chronological events.

**Background jobs:** `contract_diff(contractId)`, `invite_reminder/expiry`.

---

## Contract vs Quote — Diff Rules (Guardrail)

Compare exactly; emit pass/fail per item:

* VIN, year/make/model/trim
* MSRP, dealerDiscount
* Incentives: same **names and amounts** (order doesn’t matter)
* Fees: docFee, dmvFee, tireBatteryFee, other fees (names + amounts)
* Add‑ons: any present must have `approvedByBuyer===true`; otherwise **fail**
* Tax rate and tax amount (allow small rounding tolerance)
* OTD total exact match

If any fail → `Contract.status='mismatch'`, block completion, show actionable checklist. When all pass → `checked_ok`.

---

## Shadiness Score (Badge)

* +10: quote missing itemization but has OTD
* +15: any addon with `approvedByBuyer=false`
* +10: credit pull required for cash/wire (dealer checkbox)
* −10: honors advertised VIN price (dealer checkbox)
* −15: contract matches accepted quote on first try
  Clamp 0–100 → Levels: Low / Medium / High.

---

## RLS & Access Control (Supabase)

* **Dealers:** read/write only quotes tied to their `DealerInvite` (via token); cannot read buyer PII beyond first initial until quote `accepted`.
* **Buyers:** read all quotes on their brief; can send counters/accept; cannot see other buyers.
* **Ops:** full access via service role; can send invites and edit dealers.

---

## Email Templates (generate HTML + text)

1. **Dealer Invite:** brief summary, line‑item requirements, 48h deadline, magic link.
2. **Counter — Remove Add‑ons:** list names/amounts; request updated OTD with add‑ons removed.
3. **Counter — Match Target OTD:** target amount, no add‑ons.
4. **Contract Mismatch:** list failed checks; request corrections.

---

## Frontend Screens

**Buyer**

* `/brief/new` — intake with Zod validation.
* `/brief/:id` — timeline at top; tabs: Offers, Counters, Contract.
* Offers Board — cards with OTD/badges/chips; drawer for breakdown + file viewer.
* Counter modal — two templates; preview email body.
* Contract Check — green/red checklist; disable “Proceed” until green.

**Dealer**

* `/d/:token` — quote form (autosave), file uploader, “revise quote” flow, success state.

**Ops**

* Dealer selection + invite composer.
* Incoming Quotes list (filters: draft/published, low confidence).
* Quote Review (edit and publish email‑ingested quotes).

**Shared**

* PDF/image viewer modal; toasts; empty states; skeleton loaders; accessible large tap targets.

---

## Testing & Acceptance

**Unit/Integration**

* Quote normalization math; negative amounts rejected; OTD required for shortlist.
* Counter generation: correct email payload + timeline event.
* Contract diff: all mismatch cases flagged; pass when fixed.

**E2E Scenarios**

1. Dealer submits clean quote → shows as **Cleanest** on Offers Board.
2. Buyer sends remove‑addons counter → dealer revises → OTD unchanged → badge improves.
3. Buyer accepts → dealer uploads contract with extra fee → guardrail blocks → dealer fixes → pass → completion.
4. Email‑ingested PDF → ops review completes fields → publish → buyer sees it.

**Definition of Done**

* From a new brief, ops invites dealers; at least **two** itemized OTD quotes appear without opening PDFs.
* Buyer sends a counter and sees a revised OTD reflected.
* Contract upload triggers diff; mismatches block; green checklist enables completion.
* Export timeline to a single PDF including accepted quote breakdown.

---

## Configuration (ENV)

* `NEXT_PUBLIC_APP_URL`
* `SUPABASE_URL`, `SUPABASE_ANON_KEY`, service key for server ops
* `DATABASE_URL` (if using Prisma outside Supabase client)
* `STORAGE_BUCKET`, region/keys (if not using Supabase storage defaults)
* `EMAIL_API_KEY` (Resend/SendGrid)
* `DOCUSIGN_*` (integration key, account, user id) — can be stubbed
* `JWT_SECRET` (if used), `INVITE_EXPIRY_DAYS`

---

## Deliverables

* Working PWA in a single repo (Vercel + Supabase suggested).
* Schema + migrations; seed script.
* API routes and typed client hooks.
* Buyer, Dealer, Ops UIs as described.
* Email templates.
* Background worker for contract diff + reminders.
* Tests (unit + at least 2 E2E flows).
* README with deploy steps and environment setup.

---

## Implementation Notes

* Prefer a small `services/` layer for business logic (quotes, counters, contract checks) so native iOS can reuse the HTTP API later.
* Store original PDFs/images unmodified; link via `FileAsset`.
* Allow tiny tax rounding tolerance (≤ $2) in the diff rules.
* Mask buyer identity to dealers (first‑initial) until quote `accepted`.
* Every state change and outbound email should create a `TimelineEvent` (auditability).
