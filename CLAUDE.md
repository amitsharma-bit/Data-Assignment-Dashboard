# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A dashboard for assigning HubSpot company data — pooled under the "Salesops ." owner — out to sales reps. Static React (Vite) SPA with exactly one piece of server code (a Vercel Edge Function proxy). No database, no login system, no test suite, no lint config. Full product context lives in `README.md` — read it before making non-trivial changes; it documents the four tabs, the "known open items" (a couple of HubSpot property mappings that are best guesses, not verified), and the security posture. Don't duplicate that content here — this file is about how the code is put together.

## Commands

```bash
npm install
cp .env.local.example .env.local   # fill in HUBSPOT_ACCESS_TOKEN
npm run dev                        # `vercel dev` — serves the static app AND api/hubspot.ts together (first run asks to link a Vercel project)
npm run dev:vite-only              # Vite dev server only, no proxy — /api/hubspot calls will fail, useful for pure UI work
npm run build                      # `tsc -b && vite build` — this is also the typecheck; run it after any change
npm run preview                    # preview the production build
npm run deploy                     # `vercel --prod`
```

There is no lint script and no test runner configured — `npm run build` (which runs `tsc -b` first) is the only automated check in this repo.

## Architecture

**No backend beyond one proxy function.** `api/hubspot.ts` is a Vercel Edge Function whose only job is to hold `HUBSPOT_ACCESS_TOKEN` server-side and forward requests to `api.hubapi.com`. It exists because HubSpot's API doesn't allow direct browser calls with a private-app token (no CORS headers) — not because this app needs a real backend. It checks requests against `ALLOWED_PATH_PREFIXES` (a hardcoded allowlist) and an optional `DASHBOARD_ACCESS_KEY` header; it does not distinguish reads from writes, so the `/crm/v3/objects/companies` prefix also covers the batch update/read calls used for reassignment. Everything else — filtering, grouping, sorting, scoring-style logic — runs client-side in the browser.

**No database.** `src/lib/db.ts` wraps IndexedDB with four object stores: `companies`, `owners`, `teams`, and `meta` (a plain key/value store used for `lastSyncedAt` and `rosterOverrides`). This is all per-browser — nothing is shared across devices or synced to a server. `useAppData` (`src/hooks/useAppData.ts`) is the single hook that loads this on mount and is the source of truth for app state; `App.tsx` calls it once and passes slices down as props. There's no router — `App.tsx` holds a `tab` string in `useState` and renders one of the four tab components.

**HubSpot sync flow**: `src/lib/hubspot/mapping.ts` is the one place that maps HubSpot internal property names to `CompanyRecord` fields (`COMPANY_PROPERTIES_TO_FETCH` + `mapHubspotCompanyToRecord`) — add a new property here first if you need a new field. `src/lib/hubspot/sync.ts` does full and incremental company sync plus owner/team sync, calling the proxy via `src/lib/hubspot/proxyClient.ts` and writing results into IndexedDB. `src/lib/hubspot/mutate.ts` is the *only* write path in the app (`reassignCompanies`) — it batch-updates `hubspot_owner_id` in HubSpot, then re-fetches those exact records so the local cache reflects HubSpot's own recomputed values instead of a client-side guess. Every reassignment UI action confirms with the user first, since it's a real, immediate mutation to live CRM data.

**Filter engine** (`src/lib/filters/`) is a generic AND/OR condition tree evaluated in-memory against `CompanyRecord[]` — no SQL, no server round-trip. `fields.ts`'s `FIELD_REGISTRY` is the single place that maps a filterable field key to its `CompanyRecord` column and value `kind` (`string`/`number`/`boolean`/`date`), which in turn drives which operators are legal for it (`OPERATORS_BY_KIND`). Add an entry here to make a new column filterable/sortable anywhere in the app.

**Pod/role resolution is two-layered** — this is the part most likely to trip someone up. `src/lib/pods.ts` has a static `POD_ROSTER` (matched by owner *name*, so it silently goes stale if someone's name changes). `src/lib/rosterOverrides.ts` holds admin-set overrides keyed by owner *id* (set via the Admin · Control Center tab, stored in IndexedDB) and always wins when present. `podForOwner(ownerId, ownersById, overrides)` / `roleForOwner(...)` in `pods.ts` do the merge — **always call these with the current `rosterOverrides` map**, never read `POD_ROSTER` directly, or Admin-tab changes won't be reflected. `getDistinctPods(overrides)` is how the set of pods shown on the leaderboard/dropdowns is computed (roster pods + any pod introduced purely via an override).

**"Salesops ." pool**: `src/lib/salesops.ts`'s `findSalesopsOwner` locates that owner by normalized-name match (not a hardcoded id, since the id is portal-specific and wasn't confirmed live). `DataAssignmentTab` and `SmartPlannerTab` both scope to `companies.filter(c => c.ownerId === salesopsOwner.id)`.

**Group Dealership grouping**: a "GD" isn't necessarily one HubSpot object — several company records can share a `gd_id`/`gd_name`. `src/lib/gdGrouping.ts`'s `groupByGD` collapses those into one row per distinct GD, taking the first non-null value across the group for each GD-level attribute (potential rooftops, dealership rank, GD stage, etc.) and flagging `country` as `"Mixed"` if the underlying records disagree.

**Design system**: `src/index.css` defines a small `@layer components` set (`.card`, `.btn-primary`/`.btn-secondary`/`.btn-danger-ghost`, `.input`, `.segmented`/`.segmented-item(-active)`, `.pill-idle`/`.pill-active`, `.badge-*`, `.table-shell`) — use these instead of writing new ad hoc Tailwind strings, so new UI stays visually consistent with the rest of the app. `src/components/ui/` has two small shared components: `Avatar` (deterministic colored initials per owner id) and `RoleBadge` (SDR/AE pill).

**The four tabs** (`src/components/{OverviewTab,DataAssignmentTab,SmartPlannerTab,AdminControlCenter}.tsx`) are independent top-level screens wired up in `App.tsx`; there's no shared tab-level state beyond what `useAppData` provides. `CompanyDrawer` (detail panel) and `AssignToControl` (the reassignment picker + confirm) are shared across multiple tabs.
