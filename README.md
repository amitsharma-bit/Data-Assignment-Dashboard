# Data Assignment Dashboard

Dashboard that mirrors HubSpot company data into **this browser's own local
storage** (IndexedDB), scores every company for reassignment suitability,
and lets you plan owner-to-owner transfers — all client-side, no database,
no login system. Built for single-browser use; see **Architecture &
tradeoffs** for what that choice means if you ever add teammates.

## What's here

- **Dashboard tab** — searchable, sortable, column-toggleable company table
  with an assignability score on every row, a visual AND/OR filter builder,
  starter + savable filter presets, a summary/KPI panel (counts by score
  band, owner, team, lifecycle stage, website status, country), a click-in
  detail drawer per company, and CSV export.
- **Reassignment Planner tab** — pick a source owner, see their whole
  portfolio bucketed into High/Medium/Low transfer confidence (derived from
  the same scoring engine), with per-bucket or full-plan CSV export.
- **Scoring Rules tab** — edit base points, band thresholds, hard
  disqualifiers, and weighted signals through a form — no code changes
  needed to change what "assignable" means.

## Architecture

- **Frontend**: static React app (Vite). Filtering, sorting, search,
  scoring, and CSV export all run in the browser against data already
  pulled into IndexedDB — no network calls needed once synced.
- **The only server-side code**: `api/hubspot.ts`, a single Vercel Edge
  Function. Its only job is to hold `HUBSPOT_ACCESS_TOKEN` and forward
  whitelisted requests to HubSpot — the token never reaches the browser.
  (HubSpot's API doesn't allow direct browser calls with a private-app
  token at all — no CORS headers — so some tiny server piece is required
  no matter what; this is the minimum possible version of that.)
- **No database**: "Sync now" pulls companies/owners/teams through the
  proxy and writes them into this browser's IndexedDB. Scoring config and
  saved filter presets live there too (`src/lib/db.ts`).
- **No login system**: anyone who can open this browser profile can use the
  dashboard. Fine for single-person use; see below if that ever changes.

### Tradeoffs (matters if you ever add teammates)

Everything here is scoped to **this one browser**:
- Synced company data, saved filter presets, and the scoring config are all
  stored in *this browser's* IndexedDB. A different browser or device
  starts from zero and needs its own sync.
- If you later want a teammate to see the same data/presets/scoring rules
  without each of you syncing and configuring separately, that's what a
  shared backend (a real database + real auth) buys you — worth
  revisiting at that point, not before.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in HUBSPOT_ACCESS_TOKEN
npm run dev                        # runs `vercel dev` — serves the static app AND api/hubspot.ts together
```

First run of `vercel dev` will ask to link/create a Vercel project (free
tier is fine) — say yes, it's needed for the Edge Function to run locally
at all. Open the printed local URL, then click **Run first sync**.

### Deploying (optional — only if you want a hosted URL instead of localhost)

```bash
npm run deploy   # runs `vercel --prod`
```

Set `HUBSPOT_ACCESS_TOKEN` (and optionally `DASHBOARD_ACCESS_KEY` for a
lightweight shared-passphrase gate) as environment variables in the Vercel
project's dashboard — not in a file.

## Using the scoring engine

Every company gets a 0-100 score from **Scoring Rules**:
- **Hard disqualifiers** cap the score at "Poor candidate" regardless of
  anything else (defaults: OEM is Independent, DMS is Carsforsale.Com,
  Lifecycle stage (GD level) is In Pipeline/Contract Closed).
- **Weighted signals** add/subtract points from a base of 50 (defaults:
  relevant website +15, missing GD name +10, used cars in 60-200 range +15,
  more than 2 contacts +10, US geography +5, group dealership +5).
- Bands: 90-100 Highly assignable, 70-89 Good candidate, 40-69 Needs
  review, 0-39 Poor candidate — thresholds are editable too.

Every score's reasons and disqualifiers are stored and shown verbatim in
the detail drawer and CSV export — nothing is re-derived or hidden.

## Known open items (not blockers, confirm on first real sync)

- **Total cars**: both `total_cars` and `total_cars_in_inventory` exist as
  properties in the portal. `src/lib/hubspot/mapping.ts` prefers
  `total_cars_in_inventory`, falling back to `total_cars`.
- **Last activity date**: mapped to `notes_last_contacted` as the closest
  standard HubSpot property — confirm this is what you mean, and adjust in
  `src/lib/hubspot/mapping.ts` + `src/lib/filters/fields.ts` if not.
- **HubSpot teams endpoint**: `src/lib/hubspot/sync.ts` calls
  `/settings/v3/users/teams`. If that returns an unexpected shape for your
  account type, team sync fails soft (console error, dashboard still works,
  just shows raw team IDs instead of names).
- `oem_name` exists in the portal but is labeled "not to use" and was
  intentionally excluded in favor of `oem_s`.

## Security

- `HUBSPOT_ACCESS_TOKEN` must only ever live in `.env.local` (gitignored)
  for local dev, or the Vercel project's environment variables for
  production — never in a committed file or chat.
- `api/hubspot.ts` only forwards to a hardcoded allowlist of HubSpot paths
  (companies, properties, owners, teams) — it is not a general-purpose
  proxy, specifically to avoid it being used to reach arbitrary URLs.
- If a token is ever exposed, rotate it immediately in HubSpot under
  Settings → Integrations → Private Apps.
