# Codex TODO & Session Primer

- Always read this file when Codex spins up in `/Users/s/builds/nmbliDotCom/nmbli`.
- Confirm invite-code gating env vars before making auth changes (`DEV_REQUIRE_INVITE_CODE`). Invite codes now live in the `DevInviteCode` table—check the 6-digit pool via Prisma if you need new ones.
- Keep Supabase secrets (`.env.local`, `env.txt`, Vercel env) in sync when rotating keys.
- Before pushing, run `npm run lint` and note existing script lint debt (gmail CLI, prospect stats).
- When migrating configs between `outTheDoor` and `nmbli`, verify database URLs still point to Supabase `apwdkwselqxafqfzizjk`.
- Avoid leaking plain-text secrets—consolidate creds into password manager when possible.
