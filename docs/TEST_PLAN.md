# Test Plan

**Purpose:** End-to-end + unit tests to make the pilot bulletproof.

1. **Access Control & RLS**
   - Verify buyer/dealer/ops scopes; expired/rescinded invite tokens blocked; rate limits on public POSTs (`/api/auth/magic-link`, `/api/dealer-invite/:token/quote`, email-ingest, contract upload).
   - Assertions: 401/403 for forbidden; RLS denies direct SQL; 429 on abuse.
2. **Quote Math & Normalization**
   - OTD = sum(parts); no negative amounts; duplicate incentives behavior defined (aggregate or reject).
   - Tax: `tax_amount ≈ taxable_base * tax_rate` within ±$2.
3. **Counters Lifecycle (Idempotent)**
   - One email + one `TimelineEvent` per click; revisions chain via `parentQuoteId`; Offers Board shows current vN.
4. **Contract Guardrail**
   - Fail on extra fee; fail on missing incentive name; pass on ≤$2 rounding; fail on unapproved add-on; override requires typed reason.
5. **Email Ingest Robustness**
   - Happy-path PDFs parse; fallback to Ops review < 2 minutes; duplicate `Message-ID` suppressed.
6. **File Handling & Safety**
   - MIME/size enforced; executable types rejected; presigned URLs expire; large upload retry.
7. **Performance & Resiliency**
   - P95 TTFB < 400ms for read APIs; Offers Board render < 1s on mid-tier device; offline shell + graceful retry banners.
8. **Observability & Metrics**
   - Sentry error capture with brief/dealer breadcrumbs; `/ops/metrics` shows time-to-first-quote, quotes/brief, % add-ons, diff fail rate, cycles-to-accept.
