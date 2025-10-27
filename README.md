# OutTheDoor MVP

OutTheDoor is a mobile-first PWA that helps car buyers collect itemized out-the-door (OTD) quotes, compare them side-by-side, negotiate with guided counters, and guard the contract signing process. Dealers get a lightweight portal for structured submissions, while the ops team can invite stores, normalize email-ingested quotes, and monitor contract guardrails.

## Tech Stack

- **Frontend:** Next.js App Router (TypeScript), Tailwind CSS, shadcn/ui, React Hook Form, Zod, Sonner
- **Backend:** Next.js API routes & server components, Prisma ORM, PostgreSQL (Supabase-compatible), Supabase Auth & Storage, BullMQ (optional) for background jobs
- **Email:** Resend (stub-friendly)
- **PWA:** `@ducanh2912/next-pwa` with offline shell
- **Testing:** Vitest for unit tests, Playwright skeleton for E2E smoke flows

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env.local` file based on the variables below:

```bash
cp .env .env.local
```

Key variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Base URL of the deployed app (e.g. `https://outthedoor.app`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for browser SDK |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key for server-side storage + admin ops |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name (default: `outthedoor`) |
| `DATABASE_URL` | Postgres connection string used by Prisma |
| `EMAIL_API_KEY` | Resend API key for transactional email (optional in dev) |
| `DOCUSIGN_*` | Placeholder for DocuSign integration (not yet wired) |
| `INVITE_EXPIRY_DAYS` | Dealer invite expiry window (default `3`) |
| `EMAIL_INGEST_SECRET` | Shared secret for `/api/email-ingest` webhook |
| `REDIS_URL` / `UPSTASH_REDIS_REST_URL` | Redis connection if running BullMQ workers |

### 3. Database & Prisma client

Generate the Prisma client and run the initial migration against your Postgres database:

```bash
npm run db:generate
npx prisma migrate deploy
```

Seed development data (1 buyer, 1 ops user, 3 dealers, sample brief + quote):

```bash
npm run db:seed
```

#### Automation test account

- Define `AUTOMATION_TEST_USER_EMAIL` and `AUTOMATION_TEST_USER_PASSWORD` in `.env.local` (the seed script falls back to `automation@nmbli.app` / `Automation!123` if unspecified).
- Expose the same values to the client by mirroring them to `NEXT_PUBLIC_AUTOMATION_TEST_USER_EMAIL` / `NEXT_PUBLIC_AUTOMATION_TEST_USER_PASSWORD` when you want the login screen to surface dev-only helper text.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is available before running `npm run db:seed`; the script uses it to create/update the automation user inside Supabase Auth and mirrors the record in Prisma.
- During local automation (e.g. Playwright) choose the **Email & Password** tab on `/login` and authenticate with the automation credentials.

### 4. Run the dev server

```bash
npm run dev
```

- App: http://localhost:3000
- Dealer portal links: http://localhost:3000/d/:token
- Ops dashboard: http://localhost:3000/ops

### 5. Background workers (optional)

Contract diff jobs and invite reminders enqueue via BullMQ when Redis is configured. To run the worker locally:

```bash
REDIS_URL=redis://localhost:6379 node --loader tsx src/jobs/contract-diff-worker.ts
```

The worker is safe to skip in development; without Redis, the enqueue helper logs a reminder and you can run contract checks manually via the ops UI.

## Testing

- **Unit tests:** `npm run test:unit`
- **E2E skeleton:** `npm run test:e2e` (requires Playwright + running app; tests are scaffolded and skipped by default until environment is ready)

Vitest covers shadiness scoring and contract diff collection logic. Add additional service-layer tests as business rules evolve.

## Project Structure Highlights

```
src/
  app/
    briefs/…        # Buyer intake, offers board, contract guardrail
    dealer/         # Dealer landing + tokenized portal
    d/[token]/      # Dealer quote form entry point
    ops/…           # Ops dashboards & review flows
    api/…           # JSON + multipart API surface
  components/
    brief/          # Buyer-side UI widgets
    dealer/         # Dealer portal UI
    ops/            # Ops tooling (invites, publish controls)
    providers/      # Supabase + toast providers
  lib/
    services/       # Domain services (briefs, quotes, contracts, storage, email, jobs)
    validation/     # Zod schemas shared across server/client
    utils/          # Formatting + Prisma helpers
```

## Key Flows Implemented

- **Magic link auth:** Supabase passwordless links with role metadata. Ops-only impersonation cookie for dealer debugging (disabled in production).
- **Buyer brief intake:** Mobile-friendly form with validation, timeline chips, offers board, counter templates, and contract guardrail checklist.
- **Dealer portal:** Token-protected quote submission with granular line items, uploads to Supabase Storage, shadiness scoring, and stateful invite tracking.
- **Ops control:** Dealer invitation wizard, incoming quote table with publish controls, timeline events, email ingestion webhook stub.
- **Guardrails:** Contract diff rules (VIN, pricing, fees, incentives, add-ons, tax, OTD) with mismatch checklist, shadiness score adjustments, and email templates for follow-up.
- **PWA polish:** Offline shell (`/offline`), installable manifest + icons, network-first caching via Workbox.

## Deployment Notes

- Deploy the Next.js app (Vercel is recommended). Set `NEXT_PUBLIC_*` and secrets as project environment variables.
- Provision a managed Postgres (Supabase recommended). Run `prisma migrate deploy` followed by `npm run db:seed` for staging/demo data.
- Configure Supabase Storage bucket (default `outthedoor`) and grant the service role key.
- Resend (or your transactional provider) must allow sending from `ops@mail.outthedoor.app` or update the sender in `src/lib/services/email.ts`.
- Redis/BullMQ is optional. If you skip it, ensure contract checks are triggered manually from the ops UI.

## Git & CI Tips

- `npm run lint` to run ESLint.
- `npm run test:unit` to keep vitest suite green.
- `npm run test:e2e` once Playwright is configured with a seeded environment.

Happy quoting! 🚗💨
