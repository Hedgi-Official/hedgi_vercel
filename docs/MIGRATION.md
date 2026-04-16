# Hedgi: Replit → Vercel migration runbook

This is the operational playbook for the cutover. It assumes the source
changes from Phases 1, 2, and 3 are committed and merged. If you're reading
this BEFORE merging, do that first.

## Background

`hedgi_vercel` was forked from `hedgi_replit` (currently serving
https://hedgi.ai/ from Replit). The goal is to run an equivalent deployment
on Vercel, validate it against the same Neon DB, then DNS-cut hedgi.ai to
Vercel and decommission Replit.

The two deploys can run **in parallel** because:
- They share the same Neon Postgres (no schema conflicts; new tables added
  by Phase 2 are additive).
- Sessions live in the DB on Vercel (`session` table) but only in memory
  on Replit — no cross-contamination.
- Auth env-var fallbacks (`SESSION_SECRET || REPL_ID`,
  `APP_URL || REPLIT_DOMAIN`) keep Replit's existing config working.

## Pre-flight

Before doing any of the steps below:

- [ ] You have the **Neon `DATABASE_URL`** the Replit deploy uses.
- [ ] You have the **Mercado Pago, OpenAI, SMTP credentials** the Replit
      deploy uses (check Replit's Secrets pane).
- [ ] You have **registrar access** for `hedgi.ai` (to update DNS later).
- [ ] You can install the `vercel` CLI:
      ```
      npm i -g vercel
      ```

## Step 1 — Apply the schema additions to the shared Neon DB

The Phase 2 changes added two tables: `session` (auto-created by
connect-pg-simple at first request) and `invite_codes` (defined in
`db/schema.ts`). Push the schema change now so Vercel can write to it on
first deploy:

```bash
# In a clean shell at the repo root:
export DATABASE_URL='postgres://...'   # the same Neon URL Replit uses
npm install
npm run db:push
```

Drizzle will diff the schema and ask you to confirm the CREATE TABLE for
`invite_codes`. Approve. The Replit deploy is unaffected — it doesn't read
this table.

> The `session` table is created by `connect-pg-simple` on the first
> request that touches sessions, so you do **not** need to push it.

## Step 2 — Backfill the invite codes

The Replit deploy mutates a `.env` file at runtime to "burn" used invite
codes. The Vercel deploy uses the new `invite_codes` table for the same
purpose. Seed the table from the current Replit codes:

```bash
# Same shell as above (DATABASE_URL still set):
export BETA_INVITE_CODES='HEDGI2BETA2025, 3333BETAHEDGI9010, ...'
# (full list from the .replit file's userenv.shared)
npm run db:seed-invite-codes
```

The script uses `ON CONFLICT DO NOTHING`, so re-running is safe — it will
not resurrect codes that have already been used on Vercel.

## Step 3 — Link the repo to Vercel

```bash
cd /path/to/hedgi_vercel
vercel link
# Follow prompts. Choose your team/scope, create a new project named "hedgi"
# (or whatever you prefer). Confirm the root directory.
```

This creates `.vercel/` (gitignored) with the project link.

## Step 4 — Set environment variables in Vercel

Open the Vercel dashboard → your project → Settings → Environment
Variables. For **each** variable in `.env.example`, add it for both the
**Production** and **Preview** scopes.

Required (deployment fails or misbehaves without these):

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Same Neon URL as Replit during cutover |
| `SESSION_SECRET` | Generate fresh: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `APP_URL` | `https://hedgi.ai` for Production; leave blank for Preview |
| `OPENAI_API_KEY` | Same key as Replit |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `HEDGI_APP_SECRET` | Same SMTP creds as Replit |
| `FLASK_URL` | Same Flask service URL Replit uses |
| `HEDGI_TEST_API_KEY` | Same value as Replit's `userenv.shared` |

Optional (only if `ENABLE_PAYMENTS=true`):

| Variable | Notes |
|---|---|
| `ENABLE_PAYMENTS` | `true` to turn on Mercado Pago |
| `MP_BR_PUBLIC_KEY`, `MP_BR_ACCESS_TOKEN` | Brazil keys |
| `MP_MX_PUBLIC_KEY`, `MP_MX_ACCESS_TOKEN` | Mexico keys |
| `MP_ACCESS_TOKEN`, `PUBLIC_URL` | Legacy fallback / payment redirect base |

> **Do NOT set** `BETA_INVITE_CODES`, `VERCEL`, `VERCEL_URL`, or
> `NODE_ENV` in the Vercel UI. The first is now a DB table; the others
> are auto-set by Vercel.

## Step 5 — First preview deploy

```bash
vercel
# Picks up vercel.json. Builds with `npm run build:vercel`. Bundles
# api/index.ts. Deploys to a preview URL like https://hedgi-abc123.vercel.app
```

Watch the build log. If it fails with a missing env var, add it in
Settings → Env Vars → Preview, then redeploy with `vercel --force`.

### Smoke checks against the preview URL

Hit each in order; investigate before continuing if any fail:

- [ ] `GET /` → loads landing page; check page title is correct (proves
      SEO injection works on Vercel)
- [ ] `GET /ping` → `{"message":"pong"}` (proves function reaches Express)
- [ ] `GET /api/user` while logged out → 401 (proves auth + sessions wired)
- [ ] Sign in with an existing user, then refresh `/api/user` → 200 with
      user payload (proves session persists across requests — the most
      important test of `connect-pg-simple`)
- [ ] Trigger password-reset email; verify the link in the email points to
      the **preview URL** (proves `APP_URL` fallback works for previews)
- [ ] Open the Mercado Pago brick on a payment page; verify the iframe
      loads (proves `/api/proxy/brick` works and `FLASK_URL` reaches Flask)
- [ ] Open `/dashboard` directly (no login flow) — should redirect to
      `/auth` (proves SPA fallback returns the SPA HTML, not 404)
- [ ] Register a brand new test user with one of the seeded invite codes;
      verify the code is marked used in the `invite_codes` table

If anything fails, fix in code → push → redeploy. **Do not proceed until
every check passes.**

## Step 6 — Promote preview to Production

```bash
vercel --prod
```

This deploys to the project's production URL (something like
`hedgi.vercel.app`). Re-run the smoke checks against the prod URL.

## Step 7 — Attach the custom domain

Vercel dashboard → your project → Settings → Domains → Add → `hedgi.ai`
(and `www.hedgi.ai`). Vercel will show DNS records to add at your registrar.

**Lower the DNS TTL on `hedgi.ai` to 60 seconds at least 24 hours before
the cutover.** This shrinks the rollback window if anything breaks.

## Step 8 — DNS cutover

At your registrar, point `hedgi.ai` (and `www.hedgi.ai`) at the Vercel
records. Watch DNS propagation with `dig hedgi.ai +short` from a few
locations.

Once propagation looks consistent (5–60 minutes depending on TTL):

- [ ] Re-run the full smoke check list against `https://hedgi.ai/`
- [ ] Watch Vercel Function logs for ~30 minutes; confirm no 5xx spike
- [ ] Watch Neon dashboard; confirm no connection-pool exhaustion

## Step 9 — Decommission Replit

Wait **48 hours** before this step in case you need to roll back. Then:

- [ ] In Replit, suspend the deployment (don't delete yet)
- [ ] Confirm hedgi.ai still works from Vercel
- [ ] Wait another 48 hours
- [ ] Delete the Replit deployment
- [ ] Remove the `REPL_ID || ` and `REPLIT_DOMAIN ||` legacy fallbacks
      from `server/auth.ts` (Phase 1 left them as a compat shim)
- [ ] Delete `.replit`, `replit.nix`, `replit.md`, `replit.lock` from the
      repo
- [ ] Final commit: "Remove Replit migration compat shims"

## Rollback plan

If the cutover goes sideways within the first 48 hours:
1. Revert the DNS records at your registrar to point back at Replit.
2. With TTL 60s, propagation takes ~1–5 minutes for most resolvers.
3. Replit deploy is still live and untouched — it should serve traffic
   immediately. The shared Neon DB means user data continuity is
   preserved.
4. Investigate the Vercel issue, fix, redeploy to a preview URL, retest,
   re-attempt the cutover.

## Known follow-ups (not blockers)

**Developer docs:**
- Rate-limits and idempotency block on `/developers` is deferred pending product-truth confirmation of what `api.hedgi.ai` actually enforces (deferred 2026-04-16); re-add only once verified.

**Code quality:**
- Pre-existing TypeScript strict errors in `server/routes.ts` (~30
  `unknown`-type spread errors). Build succeeds via esbuild. Worth a
  cleanup pass.
- Three orphan files in `client/src/pages/archive/` reference deleted
  components. Delete or restore.
- `server/templates/` (payment.html, payment_status.html) is orphaned —
  never referenced in code. Payment routes generate HTML inline. Safe to
  delete.
- `theme.json` is now inert (only read by the removed Replit Vite plugin).
  Safe to delete or keep for documentation.

**Performance:**
- Lazy-load `exceljs` (22 MB) inside the batch-upload handler to shave
  cold-start time once we observe real Vercel cold-start latency.
- Code-split the 1.85 MB client bundle (`vite build` already warned
  about it). Split out recharts and country-flag-icons into async chunks.
- Static assets are served through the Express function (not Vercel CDN)
  to preserve SSR SEO injection. Once SEO is confirmed working, consider
  routing `/assets/*`, `/favicon.ico`, `*.png` to CDN directly.
- Static asset caching is currently `maxAge: 0, etag: false` in
  `server/vite.ts`. Since Vite adds content hashes to filenames, a
  longer maxAge (e.g. 1 year) would reduce bandwidth.

**Serverless hygiene:**
- `connect-pg-simple`'s `pruneSessionInterval` timer behaves
  unpredictably in serverless (suspended when function freezes, fires
  on next warm start). Expired sessions will accumulate during low-traffic
  periods. Consider a Vercel Cron endpoint to `DELETE FROM session WHERE
  expire < now()` on a schedule.

**Cleanup after Replit decommission (Phase 4):**
- Remove `REPL_ID ||` and `REPLIT_DOMAIN ||` legacy fallbacks from
  `server/auth.ts`.
- Delete `.replit`, `replit.nix`, `replit.md` from the repo.
- Remove the `build` script's esbuild step if standalone prod is no longer
  needed.
- Look at moving `MP_ACCESS_TOKEN` (deprecated) into the BR/MX-scoped
  vars and remove the fallback in `server/routes.ts`.
