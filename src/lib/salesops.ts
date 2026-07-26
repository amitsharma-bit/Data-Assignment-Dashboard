import type { OwnerRecord } from "./types";

/**
 * Finds the "Salesops ." owner by name rather than a hardcoded owner id —
 * the exact id is portal-specific and couldn't be verified live (HubSpot
 * connector was disconnected while this was built). Matches case-
 * insensitively and ignores trailing periods/whitespace, so "Salesops .",
 * "Salesops.", or "SalesOps" all resolve the same way.
 */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[.\s]/g, "");
}

export function findSalesopsOwner(owners: OwnerRecord[]): OwnerRecord | undefined {
  return owners.find((o) => o.name && normalize(o.name) === "salesops");
}
