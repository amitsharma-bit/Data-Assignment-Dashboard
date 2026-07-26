import { getMeta, setMeta } from "./db";
import type { OwnerRole } from "./types";

export interface RosterOverride {
  ownerId: string;
  role: OwnerRole;
  pod: string | null;
}

export type RosterOverrideMap = Record<string, RosterOverride>;

const META_KEY = "rosterOverrides";

/**
 * Admin-set pod/role assignments, keyed by HubSpot owner id rather than
 * name — set from the Admin Control Center tab by picking a real synced
 * owner from a dropdown, so these can never suffer the name-mismatch
 * problem the static POD_ROSTER in pods.ts is prone to. Takes precedence
 * over that static roster wherever both exist for the same owner.
 */
export async function loadRosterOverrides(): Promise<RosterOverrideMap> {
  return (await getMeta<RosterOverrideMap>(META_KEY)) ?? {};
}

export async function saveRosterOverride(override: RosterOverride): Promise<RosterOverrideMap> {
  const all = await loadRosterOverrides();
  const next = { ...all, [override.ownerId]: override };
  await setMeta(META_KEY, next);
  return next;
}

export async function removeRosterOverride(ownerId: string): Promise<RosterOverrideMap> {
  const all = await loadRosterOverrides();
  const next = { ...all };
  delete next[ownerId];
  await setMeta(META_KEY, next);
  return next;
}
