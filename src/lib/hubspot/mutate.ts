import { hubspotProxyFetch } from "./proxyClient";
import { COMPANY_PROPERTIES_TO_FETCH, mapHubspotCompanyToRecord } from "./mapping";
import type { HubspotObject } from "./types";
import { putCompanies } from "@/lib/db";

const BATCH_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * The only write path in this app — changes Company owner directly in
 * HubSpot for every id given, then refetches those records so the local
 * cache reflects HubSpot's own recomputed values (team, owner-assigned
 * date) rather than us guessing them client-side.
 */
export async function reassignCompanies(companyIds: string[], newOwnerId: string): Promise<void> {
  for (const batch of chunk(companyIds, BATCH_SIZE)) {
    await hubspotProxyFetch("/crm/v3/objects/companies/batch/update", {
      method: "POST",
      body: {
        inputs: batch.map((id) => ({ id, properties: { hubspot_owner_id: newOwnerId } })),
      },
    });
  }

  for (const batch of chunk(companyIds, BATCH_SIZE)) {
    const res = await hubspotProxyFetch<{ results: HubspotObject[] }>(
      "/crm/v3/objects/companies/batch/read",
      {
        method: "POST",
        body: {
          inputs: batch.map((id) => ({ id })),
          properties: COMPANY_PROPERTIES_TO_FETCH,
        },
      },
    );
    await putCompanies(res.results.map(mapHubspotCompanyToRecord));
  }
}
