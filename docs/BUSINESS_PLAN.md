# Nmbli — Business Plan (v1)

> A mobile-first car buying assistant that converts a buyer’s brief into verified, itemized **out-the-door (OTD)** quotes, automates negotiation, and prevents contract mismatches before e-sign.

---

## 1) Executive Summary

**Problem:** Car buyers face opaque pricing, pressure tactics, and last-minute contract changes. Dealers juggle unqualified leads and time-consuming back-and-forth.

**Solution:** **Nmbli** is a concierge-style web app (PWA) that: (1) equips the Nmbli ops team to collect and normalize dealer quotes to OTD via phone/email—dealers never log into or "join" Nmbli; (2) automates clean counteroffers that ops deliver back through the same channels; (3) blocks e-signing if the final contract deviates from the accepted quote. Buyers get clarity; dealers get prepped, decisive customers without adopting new software.

**Why now:** E-sign adoption is mainstream; consumers expect remote transactions; dealers suffer shrinking margins and welcome efficient, pre-qualified deals. Regulatory attention on junk fees makes transparency a competitive advantage.

**MVP proof:** Within one metro and one brand, collect 2–4 itemized OTD quotes within 48 hours, remove unwanted add-ons, and deliver a contract that matches the accepted quote.

**Business model:** Dual-sided: buyer fee (concierge/success) + dealer fee (per closed deal or subscription). Ancillary revenue from warranties/maintenance add-ons (opt-in, transparent) and optional financing referral revenue where permitted.

**Go-to-market:** Pilot with a curated dealer cohort; content/SEO around OTD education; partnerships with credit unions and car-buying communities; referral loop.

**Milestones (12 months):** Ship MVP (Q1), prove unit economics via pilot; regional expansion (Q2–Q3); add native iOS wrapper + scanning (Q3); scale partnerships (Q4).

---

## 2) Problem & Insight

* **Opaque pricing:** Website “prices” omit fees and dealer add-ons; buyers can’t compare apples-to-apples.
* **Pressure sales motion:** Scarcity framing and time pressure lead to poor decisions.
* **Contract variance:** Extra fees appear at signing; buyers lack tools to catch/resolve.
* **Dealer pain:** Inbound leads are noisy; scheduling and quoting are high-touch with low close rates.

**Core insight:** The **only number that matters** is the verified OTD. Standardizing that number—and enforcing **contract = quote**—eliminates the most painful parts of the purchase.

---

## 3) Solution Overview

**Buyer experience**

1. Submit brief (must-haves, budget, ZIP, pay type).
2. Review 2–4 normalized OTD quotes with plain-English breakdowns.
3. Approve one-tap counters (remove add-ons, match target OTD).
4. E-sign only when contract matches the accepted quote.

**Dealer touchpoints (offline)**

* Ops reaches out with a templated brief and requests itemized quotes over the dealer’s existing workflows (email, phone, shared docs).
* Dealers reply as they do today (worksheets, PDFs, email notes). Ops re-keys and normalizes everything inside Nmbli, then relays counters or contract requests back over those same channels.

**Trust mechanics**

* OTD normalization, contract diff check, audit trail timeline, and a “No Surprises” pledge.

---

## 4) Market

**Scope:** New/late-model used retail car purchases facilitated digitally in the U.S.

* **TAM (directional):** ~15M new + ~15M used retail annually. Assume 40% of transactions are digitally influenced ⇒ ~12M relevant opportunities.
* **SAM (initial reachable):** Focus on 3 metro areas × 4 brands (Toyota, Honda, Mazda, VW) ⇒ ~250k annual transactions.
* **SOM (Year 1 realistic):** 1,500–3,000 assisted deals across pilot metros.

*Notes:* Figures are directional; refine with real dealer network data and metro choice.

---

## 5) Competitive Landscape

* **Marketplaces/listing sites:** Autotrader, Cars.com, CarGurus—great discovery, weak OTD verification/contract parity.
* **Direct online retailers:** Carvana/Vroom—inventory owned; we’re inventory-agnostic and deal-centric.
* **Buying services / brokers:** Costco, AAA, local concierges—human-heavy, not contract-guarded or OTD-standardized.
* **OEM digital retailing tools:** Varies by brand; typically dealer-configurable, inconsistent on OTD and add-on control.

**Differentiation:**

1. OTD standard + contract guardrail.
2. Structured negotiation without phone tag.
3. Timeline with receipts.

---

## 6) Business Model

**Buyer pricing (test matrix):**

* Free to start; **$199 concierge fee at acceptance**, plus **$299 success fee** at contract completion; waive success fee for early cohorts.
* Subscription option later (e.g., $9/mo) for power users (alerts, saved briefs) if warranted.

**Dealer pricing (choose one for pilot):**

* **Per-closed-deal:** $200 when the buyer completes e-sign.
* **OR Light subscription:** $199/mo for prioritized invites + analytics, with a $100 per-close credit.

**Ancillary (transparent, opt-in):**

* Warranties/maintenance: 5–10% rev-share where legal.
* Financing referrals: fixed fee per funded loan through partners (credit unions/fintechs).

**Unit economics (illustrative):**

* **Revenue per completed deal:** $199 buyer concierge + $299 success + $200 dealer = **$698** (pilot; expect to waive some early).
* **COGS per deal:** DocuSign & email/storage ~$8, support/Ops ~$60, parsing/time ~$20 ⇒ **~$88**.
* **Gross margin:** ~$610 (before CAC + overhead).
* **CAC (early):** blended $120–$250 (content, referrals, community, light paid).
* **Payback:** target < 1 deal.

---

## 7) Go-to-Market Strategy

**Phase 1 – Pilot (months 0–3)**

* Recruit 8–12 cooperative dealers in one metro and one brand (e.g., Toyota).
* Acquire first 100 buyers via local credit unions, Reddit/Discord car communities, and targeted social ads (explain OTD).
* Offer fee waivers to seed reviews and case studies.

**Phase 2 – Regional scale (months 4–9)**

* Expand to 3–4 brands; replicate dealer playbook; add light PR (transparency angle).
* Content engine: explain OTD, doc fees by state, add-on glossary; SEO capture.

**Phase 3 – Partnerships (months 9–12)**

* Credit unions (pre-qualified members); employers (benefit perk); relocation services.

**Messaging pillars**

* “**Only OTD.** Apples-to-apples quotes.”
* “**Contract = Quote.** We block mismatches.”
* “**You don’t haggle—rules do.**”

---

## 8) Product & Roadmap

**MVP (months 0–2)**

* Buyer brief intake, ops workspace for logging dealer quotes received via email/phone, OTD normalization, Offers Board, counter templates that ops send back out, contract guardrail, timeline export.

**V1 (months 3–6)**

* Ops intelligence dashboards (dealer responsiveness, win rate), web push for buyers, auto-capture advertised VIN price for counter support, low-touch OCR.

**V2 (months 6–12)**

* Native iOS wrapper (scan VIN/doc), trade-in appraisal via partner, inventory/ETA integrations (selected OEM APIs), referral program.

---

## 9) Operations

**People (first 6 months)**

* 1 Founding PM/CEO, 1 Full-stack, 1 Frontend, 1 Ops concierge (part-time), fractional Legal/Accounting.

**Workflow**

* Ops curates dealer relationships, monitors SLAs, performs <2-minute parser corrections, escalates tricky counters, and ensures DocuSign clean passes without granting dealers platform access.

**Quality bar**

* Written itemized OTD required to shortlist.
* Add-ons require explicit buyer approval.
* Contract cannot be completed until all checks are green.

---

## 10) Legal & Compliance

* **Licensing:** Avoid representing as a broker unless licensed; position as a concierge/marketplace. Review state-level auto broker rules early in pilot states.
* **E-sign:** ESIGN/UETA compliance; DocuSign BAA where needed; retain immutable PDFs and audit trail.
* **Privacy:** CCPA/GDPR-aligned privacy policy; data minimization; buyer identity masked to dealers until acceptance.
* **Marketing:** TCPA/SMS consent; clear disclosures for incentives/eligibility.
* **Payments:** If taking deposits/fees, use a compliant PSP; clear refund policy.

---

## 11) Technology Overview

* **Stack:** Next.js PWA + Supabase (Auth, Postgres, Storage).
* **Integrations:** Email (Resend/SendGrid), DocuSign webhooks, optional SMS (Twilio).
* **Key services:** Quote normalization, counter engine, contract diff, timeline/audit.
* **Security:** Magic links, Row-Level Security, pre-signed URLs, rate limiting, logging.

---

## 12) Metrics & Goals (Year 1)

**Acquisition/Activation**

* Time to first qualified quote: **<24h**; 80% of briefs get ≥2 quotes.
* Quote parse success with <2 min ops touch: **≥70%**.

**Conversion**

* Offer acceptance rate: **≥35%**; counter-to-accept improvement: **≥$300** avg.
* Contract variance at first upload: **≤15%**; post-guardrail completion: **≥95%**.

**Satisfaction**

* Buyer NPS: **≥60**; Dealer satisfaction (would quote again): **≥75%**.

**Economics**

* Gross margin per deal: **≥$400** after COGS; CAC payback **<1** deal.

---

## 13) Financial Plan (Illustrative, 12 months)

**Assumptions:**

* 2 pilot metros; 2,000 briefs; 45% receive ≥2 quotes; 35% accept; 70% complete contracts.
* Avg revenue/deal $500 (intro pricing mix), COGS $90, CAC blended $180.

**Outputs:**

* Completed deals ≈ 2,000 × 0.45 × 0.35 × 0.70 ≈ **220**.
* Revenue ≈ 220 × $500 = **$110k**.
* COGS ≈ 220 × $90 = **$19.8k**.
* Gross margin ≈ **$90k**.
* Marketing ≈ **$75k**; Staff/infra ≈ **$300k–$450k** (lean team).
* Net result: planned operating loss while proving PMF; target positive unit economics.

*Plan to update with pilot metrics after first 50 deals.*

---

## 14) Risks & Mitigations

* **Dealer non-responsiveness** → Incentivize with prioritized briefs; show competitive positioning; start with friendly stores.
* **Messy quotes/hidden add-ons** → Strict form + parser + ops review; auto counters that strip non-consented items.
* **Regulatory ambiguity** → Counsel review; avoid broker language; geo-fence if needed; clear disclosures.
* **Low consumer trust** → Radical transparency, testimonials, timeline exportable as “receipts.”
* **Margin squeeze** → Keep CAC low with partnerships/content; automate ops; focus on high-value metros/brands.

---

## 15) Roadmap & Milestones

* **M0–2:** Ship MVP; first 50 briefs; ≥70% get 2+ quotes; first 20 completed contracts.
* **M3–6:** Expand to 3 brands; add iOS wrapper (scan & push); 200 completed deals total; dealer NPS ≥60.
* **M6–9:** Partnerships; 600 completed deals cumulative; add light OCR.
* **M9–12:** Multi-metro; referral program; breakeven unit economics; 1,200 completed deals cumulative.

---

## 16) Team & Hiring Plan

* **Now:** Founders (PM/BD + 1–2 engineers), Ops/Dealer Success (part-time), fractional legal/finance.
* **Next 6–12 months:** Add Support Ops (2), Partnerships (1), Senior Eng (1), Designer (1).

---

## 17) Ask / Use of Funds (optional for investor deck)

* **$750k–$1.5M** seed to fund 12–18 months runway: team, GTM, and product scale.
* Targets: PMF indicators (NPS 60+, ≥$400 gross margin/deal, CAC payback <1 deal), metro expansion, partnership pipeline.

---

## 18) Appendix

* Buyer/Dealer email templates (OTD request, counters, contract fix).
* Fee glossary + “is this normal?” ranges.
* State-by-state doc fee norms and broker rule snapshot for pilot states.
