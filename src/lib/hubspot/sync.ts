import { hubspotProxyFetch } from "./proxyClient";
import { COMPANY_PROPERTIES_TO_FETCH, mapHubspotCompanyToRecord } from "./mapping";
import type { HubspotObject, HubspotPagedResponse } from "./types";
import { getMeta, putCompanies, putOwners, putTeams, setMeta } from "@/lib/db";
import type { OwnerRecord, TeamRecord } from "@/lib/types";

const PAGE_SIZE = 100;
const PROPERTIES_PARAM = COMPANY_PROPERTIES_TO_FETCH.join(",");

export interface SyncProgress {
  phase: "owners" | "teams" | "companies";
  processed: number;
}

interface HubspotOwner {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  archived?: boolean;
}

export async function syncOwners(): Promise<number> {
  let after: string | undefined;
  const owners: OwnerRecord[] = [];

  do {
    const query = new URLSearchParams({ limit: "100" });
    if (after) query.set("after", after);

    const res = await hubspotProxyFetch<HubspotPagedResponse<HubspotOwner>>(
      `/crm/v3/owners?${query.toString()}`,
    );

    for (const owner of res.results) {
      owners.push({
        id: owner.id,
        name: [owner.firstName, owner.lastName].filter(Boolean).join(" ") || null,
        email: owner.email ?? null,
        isActive: !owner.archived,
      });
    }

    after = res.paging?.next?.after;
  } while (after);

  await putOwners(owners);
  return owners.length;
}

interface HubspotTeam {
  id: string;
  name: string;
}

/**
 * Endpoint to confirm on first real run against the portal — HubSpot has
 * shipped team listing under slightly different shapes depending on
 * account type. Fails soft (logs, returns 0) so it never blocks company sync.
 */
export async function syncTeams(): Promise<number> {
  try {
    const res = await hubspotProxyFetch<{ results: HubspotTeam[] }>("/settings/v3/users/teams");
    const teams: TeamRecord[] = res.results.map((t) => ({ id: t.id, name: t.name }));
    await putTeams(teams);
    return teams.length;
  } catch (err) {
    console.error("Team sync failed, continuing without teams:", err);
    return 0;
  }
}

export async function fullCompanySync(onProgress?: (progress: SyncProgress) => void): Promise<number> {
  let after: string | undefined;
  let total = 0;

  do {
    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
      properties: PROPERTIES_PARAM,
    });
    if (after) query.set("after", after);

    const res = await hubspotProxyFetch<HubspotPagedResponse<HubspotObject>>(
      `/crm/v3/objects/companies?${query.toString()}`,
    );

    const records = res.results.map(mapHubspotCompanyToRecord);
    await putCompanies(records); // checkpointed immediately so a page refresh mid-sync doesn't lose progress

    total += records.length;
    onProgress?.({ phase: "companies", processed: total });

    after = res.paging?.next?.after;
  } while (after);

  return total;
}

export async function incrementalCompanySync(
  since: Date,
  onProgress?: (progress: SyncProgress) => void,
): Promise<number> {
  let after: string | undefined;
  let total = 0;

  do {
    const body: Record<string, unknown> = {
      filterGroups: [
        {
          filters: [
            { propertyName: "hs_lastmodifieddate", operator: "GTE", value: since.getTime() },
          ],
        },
      ],
      sorts: [{ propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }],
      properties: COMPANY_PROPERTIES_TO_FETCH,
      limit: PAGE_SIZE,
    };
    if (after) body.after = after;

    const res = await hubspotProxyFetch<HubspotPagedResponse<HubspotObject>>(
      "/crm/v3/objects/companies/search",
      { method: "POST", body },
    );

    const records = res.results.map(mapHubspotCompanyToRecord);
    await putCompanies(records);

    total += records.length;
    onProgress?.({ phase: "companies", processed: total });

    after = res.paging?.next?.after;
  } while (after);

  return total;
}

/** Entry point used by the "Sync now" button. Runs entirely in this browser tab. */
export async function runSync(
  type: "full" | "incremental",
  onProgress?: (progress: SyncProgress) => void,
): Promise<{ recordsProcessed: number }> {
  onProgress?.({ phase: "owners", processed: 0 });
  await syncOwners();

  onProgress?.({ phase: "teams", processed: 0 });
  await syncTeams();

  let recordsProcessed: number;
  if (type === "full") {
    recordsProcessed = await fullCompanySync(onProgress);
  } else {
    const lastSyncedAtRaw = await getMeta<string>("lastSyncedAt");
    const since = lastSyncedAtRaw ? new Date(lastSyncedAtRaw) : new Date(0);
    recordsProcessed = await incrementalCompanySync(since, onProgress);
  }

  await setMeta("lastSyncedAt", new Date().toISOString());
  return { recordsProcessed };
}
