# Pilot Runbook

**Audience:** You + Ops; week-0 through go-live.

## SLAs
- First quote ≤ 24–48h; counter turnaround ≤ 12–24h; DocuSign fix within 24h.

## Day-0 Checklist
- DNS/HTTPS, Resend DKIM/SPF/DMARC, Sentry, logs, metrics page.
- RLS tests green; rate limits enabled; DEBUG flags off in prod.

## Dealer Onboarding Email (Template)
- Itemized OTD required, 48h deadline, no unapproved add-ons, DocuSign flow, “no hard pull for cash/wire?” checkbox.

## Escalation Macros
- TTL missing → request fields or mark “TTL estimated.”
- Add-on removal → counter template.
- Advertised price mismatch → request match before tax/fees.

## Success Metrics
- Time-to-first-quote; quotes/brief; % with add-ons; average $ removed via counters; first-upload contract pass-rate; NPS.
