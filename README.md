# Data Assignment Dashboard

A dashboard for assigning HubSpot company data — currently pooled under the
"Salesops ." owner — out to sales team members. Mirrors company data into
this browser's own local storage (IndexedDB), and can write back to
HubSpot to actually change Company owner. No database, no login system.

## Tabs

### Overview
A leaderboard for the **AE Pods** (Saarthak, Neelima, Archit, Prince,
Central, plus any pods created via Admin Control Center) — a real org
structure that has nothing to do with HubSpot's own Teams feature. Each
pod card shows:
- Total Group Dealerships (distinct GDs, not raw company records)
- Total Single Accounts
- Total Companies — the sum of each GD's `#Potential Rooftops` plus the
  single-account count, i.e. the real addressable footprint, not just the
  number of HubSpot records

Click a pod card to see its accounts below, with a search box and an
[All]/[SDR]/[AE] filter.

Pod membership and SDR/AE role resolve in two layers: a baseline static
roster in `src/lib/pods.ts` (matched by owner *name*, so it can go stale),
overridden by anything set in the **Admin · Control Center** tab (matched
by owner *id*, set by picking a real person from a dropdown — this is the
one to use day-to-day; see below).

### Admin · Control Center
Assign or change anyone's pod and role from the dashboard itself — no code
edit, no redeploy. Pick a person from a dropdown of actual synced HubSpot
owners (so the id is always correct), set their role and pod, save. The
table below shows every synced owner's resolved pod/role and whether it
came from a custom assignment ("Custom") or the static roster fallback
("Roster default"), with **Revert** to drop a custom assignment back to
whatever the roster says. Stored in this browser's IndexedDB
(`src/lib/rosterOverrides.ts`) — see the tradeoffs note below.

**The static roster** (`src/lib/pods.ts`) is only the fallback/seed data
now — anyone whose name doesn't match a synced HubSpot owner falls back to
"Unassigned" rather than silently disappearing from the count, but the
fix for that going forward is the Admin tab, not editing this file.

### Data Assignment
Scoped to companies currently owned by **"Salesops ."** — the pool waiting
to be handed out. Split into:
- **Group Dealerships Available For Assignment** — one row per distinct GD
  (companies sharing a `gd_id`/`gd_name` are collapsed into one row), with
  search, the full AND/OR advanced filter builder, and bulk **Assign to**.
- **Single Companies Available For Assignment** — one row per company, with
  search, a country quick-filter, and bulk **Assign to**.

### Smart Assignment Planner
Scans the *entire* Salesops-owned pool (single companies and GD members
alike) against adjustable criteria and surfaces the best assignment
candidates:
- Minimum associated contacts (default 2)
- Minimum used cars — manual, blank means no minimum
- Exclude lifecycle stage (GD level): Contract Closed / In Pipeline, both on by default
- Exclude Independent OEM (on by default)
- Country filter

Matches are sortable, selectable, and bulk-assignable via the same
**Assign to** control as the Data Assignment tab.

## This app now writes to HubSpot

Every "Assign to" action calls HubSpot's batch update API to change
`hubspot_owner_id` on the selected companies — a real, immediate change to
live CRM data, not a local-only simulation. The UI confirms with you before
firing (shows the count and destination owner), and afterward refetches
those exact records from HubSpot so the local cache reflects HubSpot's own
recomputed values rather than a guess. There's no undo beyond reassigning
again by hand.

`api/hubspot.ts` still only forwards to a fixed allowlist of HubSpot path
prefixes — batch update/read are covered by the existing
`/crm/v3/objects/companies` prefix, nothing new was opened up.

## Architecture

- **Frontend**: static React app (Vite). Filtering, grouping, and search
  run in the browser against data cached in IndexedDB.
- **The only server-side code**: `api/hubspot.ts`, a single Vercel Edge
  Function holding `HUBSPOT_ACCESS_TOKEN` and forwarding whitelisted
  requests (HubSpot doesn't allow direct browser calls with a private-app
  token — no CORS headers — so this is the minimum possible server piece).
- **No database**: synced companies/owners/teams, and any pod/role
  overrides set via Admin Control Center, all live in this browser's
  IndexedDB (`src/lib/db.ts`). That means pod assignments made in one
  browser don't show up in another — single-browser use as currently set
  up. If that becomes a real problem (e.g. more than one person needs to
  manage the roster), that's the point where a shared backend would earn
  its keep.
- **No login system**: single-browser use as currently set up.

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in HUBSPOT_ACCESS_TOKEN
npm run dev                        # runs `vercel dev`
```

Open the printed local URL, click **Run first sync**.

### Deploying

```bash
npm run deploy   # runs `vercel --prod`
```

Set `HUBSPOT_ACCESS_TOKEN` (and optionally `DASHBOARD_ACCESS_KEY`) as
environment variables in the Vercel project's dashboard, then redeploy —
env var changes don't apply to an already-built deployment.

## Known open items — confirm these against your real portal

The HubSpot connector was unavailable while these tabs were built, so a
few mappings are best guesses rather than verified:

- **"Salesops ." owner** — resolved by matching the owner name (case/
  punctuation-insensitive) rather than a hardcoded id, in
  `src/lib/salesops.ts`. If the Data Assignment / Smart Planner tabs come
  up empty, check the exact owner name in HubSpot contains "salesops".
- **Dealership Rank** — mapped to a guessed property name,
  `dealership_rank`. If that's wrong it'll just read blank for every row;
  check Settings → Properties in HubSpot for the real internal name and
  fix it in `src/lib/hubspot/mapping.ts` + `src/lib/filters/fields.ts`.
- **GD Last Activity** — mapped to `rooftop_last_activity`, which *was*
  confirmed earlier against the live portal.
- **HubSpot teams endpoint** (`/settings/v3/users/teams`) — still synced
  and shown in the company detail drawer ("HubSpot team"), but no longer
  used for the Overview leaderboard (that's pod-based now, see above). If
  it 404s or returns an unexpected shape, sync fails soft (console error)
  rather than blocking company sync.
- **Total cars**: prefers `total_cars_in_inventory`, falls back to
  `total_cars` — both exist in the portal.
- `oem_name` exists but is labeled "not to use"; `oem_s` is used instead.

## Security

- `HUBSPOT_ACCESS_TOKEN` only ever lives in `.env.local` (gitignored) or
  the Vercel project's environment variables — never committed or pasted
  in chat. If a token or any credential is ever exposed, rotate it
  immediately in HubSpot (or wherever it came from).
- `api/hubspot.ts` forwards only to a hardcoded allowlist of HubSpot path
  prefixes — it's not a general-purpose proxy.
