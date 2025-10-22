# Magic Link Login Automation

## Overview

The Playwright scenario in `tests/e2e/magic-link-login.e2e.ts` automates the full buyer login flow:

1. Launches an isolated browser context (incognito by default).
2. Navigates to `/login`, enters the test email, and requests a magic link via the existing UI.
3. Calls the Supabase Admin API (`auth.admin.generateLink`) with the service role key to retrieve the latest magic link instead of scraping email.
4. Opens the magic link inside the same browser context, allowing Supabase to establish the session.
5. Stubs `/api/auth/complete` so the flow can run without a backing Postgres instance during local smoke tests.
6. Verifies the user lands on `/briefs` as a signed-in buyer.

This avoids any dependency on the macOS Mail application or Automator scripts while still exercising the UX and Supabase auth callbacks end to end.

## Environment Variables

Set the following before running the test:

- `PLAYWRIGHT_BASE_URL` (optional, defaults to `http://localhost:3000`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TEST_MAGIC_LINK_EMAIL` (optional override, defaults to `sanjay.devnani@gmail.com`)

The service role key is required so the test can call `auth.admin.generateLink` and retrieve the action link payload.

## Running Locally

```bash
cd nmbli
npm install
npx playwright test tests/e2e/magic-link-login.e2e.ts
```

By default the Playwright config will boot the Next.js dev server. To watch the flow interactively, append `--headed --debug` to the Playwright command.

## Running Against Hosted Environments

To target a deployed URL (e.g. Preview or Production):

```bash
PLAYWRIGHT_BASE_URL=https://app.nmbli.com \
NEXT_PUBLIC_SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npx playwright test tests/e2e/magic-link-login.e2e.ts
```

Make sure the Supabase project linked to the environment allows admin access from your test machine.

## Extending the Flow

- Remove the route stub in the test to exercise the `/api/auth/complete` Prisma upsert when a database connection is available.
- Add assertions for post-login navigation (e.g. `/briefs/new`, invite-gated flows) as new scenarios.
- If you still need macOS Mail coverage, keep the Playwright test as the fast-path and layer any AppleScript monitoring separately; the test already covers the critical Supabase handshake.
