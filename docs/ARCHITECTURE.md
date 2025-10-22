# Nmbli Architecture Documentation

**Last Updated:** October 21, 2025

## Overview

Nmbli is a platform that connects car buyers with dealerships to get transparent, itemized out-the-door (OTD) quotes. The platform eliminates the stress of car buying by collecting quotes from multiple dealers and allowing buyers to compare them side-by-side.

## Technology Stack

### Frontend
- **Framework:** Next.js 15.5.4 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom component library based on Radix UI
- **Forms:** React Hook Form + Zod validation
- **State Management:** React hooks, server/client components

### Backend
- **Runtime:** Node.js (Next.js serverless functions)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Authentication:** Supabase Auth (magic link email)
- **API:** Next.js API routes + Server Actions

### Infrastructure
- **Hosting:** Vercel (production + previews)
- **Database:** Supabase (PostgreSQL + Auth)
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
2. **Connection Pooling**: Using pgbouncer via Supavisor on port 6543
3. **SSL**: Always enforced with `sslmode=require`

## Current Features

### ✅ Implemented

1. **Authentication**
   - Magic link email authentication
   - Role-based access (buyer/dealer/ops)
   - Session management via Supabase

2. **Brief Creation** (Buyer Flow)
   - Multi-step form with validation
   - Vehicle selection (Make → Model → Trim cascading dropdowns)
   - Payment preferences (cash/finance/lease)
   - Budget constraints (max OTD, down payment, monthly payment)
   - Location (zipcode)

3. **Brief Management**
   - List all briefs for a buyer
   - View brief details
   - Track brief status

4. **Vehicle Data**
   - 44 makes, 360+ models with trims
   - Data sourced from Google
   - Cascading dropdown UI
   - Client-side filtering

5. **Testing Infrastructure**
   - Unit tests for services and utilities
   - Pre-commit hooks enforce test passage
   - 21 tests covering critical paths

6. **Type Safety**
   - Full TypeScript coverage
   - Zod validation for forms and API
   - Prisma type generation

## Recent Technical Fixes

### Vehicle Selector Bundle Issue (Oct 21, 2025)
**Problem:** Vehicle data (47KB JSON) wasn't being bundled into client JavaScript
**Solution:** Convert JSON to TypeScript constant file
**Result:** Data now properly bundled and accessible in browser

### Database Connection Issue (Oct 21, 2025)
**Problem:** Can't reach database server (IPv6 incompatibility)
**Solution:** Switch from direct connection to Supavisor pooler
**Connection String:** `postgresql://postgres.{ref}:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

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

1. **Dealer Side Not Implemented**
   - No dealer quote submission UI
   - No dealer notification system
   - No dealer dashboard

2. **Manual Dealer Outreach**
   - Currently no automated dealer discovery
   - No automated quote collection
   - No email/SMS integration

3. **Quote Comparison**
   - Basic viewing only
   - No side-by-side comparison UI
   - No contract review features

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
