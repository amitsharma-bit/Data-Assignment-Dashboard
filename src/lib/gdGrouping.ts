import type { CompanyRecord } from "./types";

export interface GDGroup {
  key: string;
  gdName: string | null;
  companies: CompanyRecord[];
  potentialRooftops: number | null;
  dealershipRank: string | null;
  gdLastActivity: string | null;
  numCarsGdLevel: number | null;
  gdStage: string | null;
  country: string | null; // "Mixed" if the linked records disagree
}

function firstNonNull<T>(values: (T | null)[]): T | null {
  for (const v of values) if (v !== null && v !== undefined) return v;
  return null;
}

/**
 * Group Dealership records aren't necessarily one HubSpot object each — the
 * same GD can be represented across several linked company records that
 * all share a gd_id/gd_name. This collapses them into one row per distinct
 * GD, taking the first non-blank value found across the group for each
 * GD-level attribute (they're expected to agree, but data entry is messy in
 * practice) and flagging "Mixed" if country genuinely disagrees.
 */
export function groupByGD(companies: CompanyRecord[]): GDGroup[] {
  const groupSource = companies.filter((c) => c.isGroupDealership === true);
  const map = new Map<string, CompanyRecord[]>();

  for (const c of groupSource) {
    const key = c.gdId ?? c.gdName ?? `__unlinked_${c.id}`;
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([key, group]) => {
    const countries = new Set(group.map((c) => c.country).filter((v): v is string => Boolean(v)));
    return {
      key,
      gdName: firstNonNull(group.map((c) => c.gdName)),
      companies: group,
      potentialRooftops: firstNonNull(group.map((c) => c.potentialRooftops)),
      dealershipRank: firstNonNull(group.map((c) => c.dealershipRank)),
      gdLastActivity: firstNonNull(group.map((c) => c.gdLastActivity)),
      numCarsGdLevel: firstNonNull(group.map((c) => c.numCarsGdLevel)),
      gdStage: firstNonNull(group.map((c) => c.lifecycleStageGdLevel)),
      country: countries.size === 0 ? null : countries.size === 1 ? [...countries][0] : "Mixed",
    };
  });
}
