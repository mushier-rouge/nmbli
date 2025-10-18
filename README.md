# nmbli.com

Next.js single-page site for the Nmbli pilot. The waitlist form writes directly to Supabase so the
team can manage outreach without relying on FormSubmit.

## Stack

- [Next.js 14](https://nextjs.org/) with the App Router
- [Supabase](https://supabase.com/) for waitlist storage (schema lives in `../nmbliBackend`)
- Deployed on [Vercel](https://vercel.com/)

## Getting started

1. Ensure Node.js 18+ and npm are installed.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.local.example` to `.env.local` and populate:

   ```bash
   cp .env.local.example .env.local
   ```

   Required keys (from your Supabase project):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000.

### Supabase types

The Supabase client is typed via `types/database.ts`. If the backend schema changes, mirror the
updates here so TypeScript stays accurate.

## Backend repository

Operational SQL, migrations, and Supabase docs live alongside this project in
`../nmbliBackend`. Follow that repo’s README to apply schema changes, manage RLS, and import data.

## Deploying on Vercel

1. Push this repository to GitHub (`Users/s/builds/nmbliDotCom/nmbli` is the working copy).
2. In Vercel, import the repo and choose the default build command (`npm run build`) and output (Next
   handles it automatically).
3. Add environment variables in **Vercel ▸ Project ▸ Settings ▸ Environment Variables** for production
   and preview:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. Trigger the first deploy. Once deployed, connect the custom domain `nmbli.com` in Vercel ▸ Domains
   and update DNS as instructed. Vercel provides the `A`/`CNAME` records to set at the registrar.

### Optional: Supabase service key

If you later add server-side actions (admin dashboards, automations), store
`SUPABASE_SERVICE_ROLE_KEY` in Vercel as a **Server** variable. It is not used by the public site.

## MTA-STS policy

The `mta-sts/.well-known/mta-sts.txt` file remains here for reference. Publish it from a dedicated
host (for example a separate Vercel project or static host) at
`https://mta-sts.nmbli.com/.well-known/mta-sts.txt` so email providers can enforce strict transport.
