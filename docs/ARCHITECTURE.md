# Nmbli Architecture Documentation

**Last Updated:** December 16, 2025

## Overview

Nmbli is a platform that connects car buyers with dealerships to get transparent, itemized out-the-door (OTD) quotes. The platform eliminates the stress of car buying by collecting quotes from multiple dealers and allowing buyers to compare them side-by-side.

## Technology Stack

### Frontend
- **Framework:** Next.js 16.0.x (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom component library based on Radix UI
- **Forms:** React Hook Form + Zod validation
- **State Management:** React hooks, server/client components

### Backend
- **Runtime:** Node.js (Next.js serverless functions)
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma
- **Authentication:** Supabase Auth (magic link, Google OAuth, password for ops/automation)
- **API:** Next.js API routes

### Infrastructure
- **Hosting:** Vercel (production + previews)
- **Database & Auth:** Supabase (PostgreSQL + Auth) via Supavisor pooler
- **Version Control:** Git + GitHub
- **CI/CD:** GitHub → Vercel automatic deployments

### Testing & Quality
- **Unit Tests:** Vitest
- **E2E Tests:** Playwright (configured)
- **Linting:** ESLint
- **Pre-commit Hooks:** Husky (runs tests before commit)

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Brief Form  │  │ Quote Viewer │  │  Auth (Magic Link)│  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Next.js (Vercel Edge Network)                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Server Components (RSC)                             │   │
│  │  - Layout rendering                                  │   │
│  │  - Data fetching                                     │   │
│  │  - Session management                                │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Routes / Server Actions                         │   │
│  │  - /api/briefs (CRUD)                                │   │
│  │  - /api/auth/callback                                │   │
│  │  - Server actions for forms                          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Prisma ORM Layer                          │
│  - Type-safe database queries                               │
│  - Connection pooling (Supavisor)                           │
│  - Migration management                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL + Auth)                   │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │  PostgreSQL  │  │  Auth API  │  │  Email Service   │   │
│  │  Database    │  │  (Magic    │  │  (Magic Links)   │   │
│  │              │  │   Links)   │  │                  │   │
│  └──────────────┘  └────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Entities

**Users**
- id (UUID)
- email (unique)
- role (buyer | dealer | ops)
- created_at, updated_at

**Briefs** (Buyer's car search request)
- id (UUID)
- buyer_id → users.id
- makes, models, trims (arrays)
- zipcode
- maxOTD (Decimal)
- paymentType, paymentPreferences (JSON)
- colors, mustHaves (arrays)
- timelinePreference
- status (sourcing | offers | decided)

**Quotes** (Dealer's offer)
- id (UUID)
- brief_id → briefs.id
- dealer_id → users.id
- status (pending | accepted | rejected)
- lines (JSON array of quote line items)
- contract data

**Timeline Events**
- Tracks brief lifecycle events
- actor (buyer | dealer | ops)
- type (brief_created, quote_submitted, etc.)

### Current Database Issues Resolved
1. **IPv6 vs IPv4**: Vercel doesn't support IPv6, switched to Supavisor pooler
2. **Connection Pooling**: Using Supavisor (pgbouncer) on port 6543 with `pgbouncer=true`, `connection_limit=1`, `connect_timeout=5`, `pool_timeout=5`
3. **SSL**: Always enforced with `sslmode=require`

## Current Features

### ✅ Implemented (Dec 2025)

1. **Authentication**
   - Magic link email (server-side code exchange to avoid PKCE verifier errors)
   - Google OAuth
   - Password login for ops/automation
   - Role-based access (buyer/dealer/ops) with Supabase session cookies

2. **Brief Creation** (Buyer Flow)
   - Form validation (React Hook Form + Zod)
   - Vehicle selection (make/model/trim cascade)
   - Payment preferences (cash/finance/lease) and budgets
   - Zipcode, colors, must-haves, timeline

3. **Brief Management**
   - Buyer brief list/detail with timeline events and quotes
   - Ops brief detail with dealer invites and quote publish controls

4. **Vehicle Data**
   - Static make/model/trim dataset with client-side filtering

5. **Testing Infrastructure**
   - Vitest unit suite (services, utilities, API)
   - Playwright scaffold (mostly skipped)
   - Husky hooks present (can be bypassed via `HUSKY=0` when necessary)

6. **Type Safety**
   - Zod schemas shared across client/server
   - Prisma types generated into `src/generated/prisma`

## Recent Technical Fixes

- **DB connectivity (Dec 2025):** Standardized Supabase pooler URLs with `pgbouncer=true`, `connection_limit=1`, `sslmode=require`, `connect_timeout=5`, `pool_timeout=5` to avoid hangs.
- **Auth callback (Dec 2025):** `/api/auth/callback` now performs server-side code exchange; client callback falls back to client exchange only if server exchange fails, preventing “code verifier” errors from Supabase.

## File Structure

```
nmbli/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── briefs/            # Brief pages
│   │   ├── login/             # Auth pages
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── brief/             # Brief-related components
│   │   │   ├── brief-form.tsx
│   │   │   └── vehicle-selector.tsx
│   │   ├── ui/                # Reusable UI components
│   │   └── providers/         # React context providers
│   ├── lib/
│   │   ├── api/               # API client functions
│   │   ├── data/              # Static data (vehicles)
│   │   ├── services/          # Business logic layer
│   │   ├── validation/        # Zod schemas
│   │   ├── prisma.ts          # Prisma client
│   │   └── supabase/          # Supabase utilities
│   └── __tests__/             # Test files
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
├── docs/                      # Documentation (this file)
└── .husky/                    # Git hooks
    └── pre-commit             # Run tests before commit
```

## Environment Variables

### Required
- `DATABASE_URL` - Supavisor pooler connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key (server-only)

### Configuration
Both `.env.local` (development) and Vercel production environment must have these set.

## Deployment Flow

1. Developer commits code
2. Pre-commit hook runs tests
3. If tests pass, commit succeeds
4. Push to GitHub
5. Vercel detects push
6. Runs build (`npm run build`)
7. Deploys to production (nmbli.com)
8. Automatic preview deployments for PRs

## Known Limitations

1. **Automation/Integrations**
   - Background automation depends on external keys (Skyvern, Google Maps) which may be absent in some environments.
   - Playwright E2E suite is scaffolded but largely skipped.

2. **Branding for OAuth**
   - Google consent screen shows the Supabase auth domain unless a custom auth domain is configured.

3. **Ops workflows**
   - Contract guardrail checks exist, but manual review is still expected when automation is disabled.

## Security

- SSL/TLS enforced for all database connections
- Environment variables stored in Vercel (encrypted)
- No sensitive data in git repository
- Row Level Security (RLS) configured in Supabase
- CSRF protection via Next.js
- Server-only secrets never exposed to client

## Performance

- Edge network via Vercel
- Database connection pooling via Supavisor
- Static generation where possible
- Client-side data (vehicles) bundled at build time
- Optimized images via Next.js Image component

## Monitoring & Observability

- Vercel deployment logs
- Vercel runtime logs
- Error boundary components
- Toast notifications for user-facing errors
- Console logging (development)

---

**Next Steps:** See ROADMAP.md for upcoming features and automation plans.
