import type { HubspotObject } from "./types";
import type { CompanyRecord } from "@/lib/types";

/**
 * Property mapping confirmed against the live portal (see the original plan).
 * A few items are still open and resolved with a safe fallback rather than a
 * guess baked in permanently:
 *  - "Total cars": both `total_cars` and `total_cars_in_inventory` exist.
 *    We prefer `total_cars_in_inventory` and fall back to `total_cars`.
 *  - "Last activity date": assumed to be `notes_last_contacted`. Confirm
 *    against the portal and adjust here if it should be a different field.
 *  - "Dealership Rank": UNCONFIRMED — the HubSpot connector was unavailable
 *    when this was added, so `dealership_rank` is a best guess at the
 *    internal name, not a verified one. It'll just read as blank everywhere
 *    if wrong — check Settings > Properties in HubSpot for the real
 *    internal name and fix it here if so.
 *  - "GD Last Activity": mapped to `rooftop_last_activity`, confirmed
 *    against the portal earlier.
 */
export const COMPANY_PROPERTIES_TO_FETCH = [
  "name",
  "domain",
  "city",
  "state",
  "country",
  "hubspot_owner_id",
  "hubspot_team_id",
  "hubspot_owner_assigneddate",
  "lifecyclestage",
  "lifecycle_stage_gd_level",
  "website_status",
  "gd_name",
  "gd_id",
  "is_this_is_a_part_of_group_dealership_",
  "dealership_group_name",
  "potential_rooftops",
  "number_of_rooftops_in_the_dealership_group_",
  "dealership_rank",
  "rooftop_last_activity",
  "num_associated_contacts",
  "num_associated_deals",
  "number_of_used_cars",
  "number_of_new_cars",
  "total_cars",
  "total_cars_in_inventory",
  "number_of_cars__gd_level_",
  "oem_s",
  "partner_name",
  "dms_name",
  "market_segment",
  "tier",
  "notes_last_contacted",
  "createdate",
  "hs_lastmodifieddate",
] as const;

function toInt(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function toBool(value: string | null | undefined): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const ms = Number(value);
  const date = Number.isFinite(ms) && value.trim() !== "" ? new Date(ms) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}

export function mapHubspotCompanyToRecord(obj: HubspotObject): CompanyRecord {
  const p = obj.properties;

  return {
    id: obj.id,
    name: nonEmpty(p.name),
    domain: nonEmpty(p.domain),
    city: nonEmpty(p.city),
    state: nonEmpty(p.state),
    country: nonEmpty(p.country),
    ownerId: nonEmpty(p.hubspot_owner_id),
    teamId: nonEmpty(p.hubspot_team_id),
    ownerAssignedDate: toIsoDate(p.hubspot_owner_assigneddate),
    lifecycleStage: nonEmpty(p.lifecyclestage),
    lifecycleStageGdLevel: nonEmpty(p.lifecycle_stage_gd_level),
    websiteStatus: nonEmpty(p.website_status),
    gdName: nonEmpty(p.gd_name),
    gdId: nonEmpty(p.gd_id),
    isGroupDealership: toBool(p.is_this_is_a_part_of_group_dealership_),
    dealershipGroupName: nonEmpty(p.dealership_group_name),
    potentialRooftops: toInt(p.potential_rooftops),
    rooftopsInGroup: toInt(p.number_of_rooftops_in_the_dealership_group_),
    dealershipRank: nonEmpty(p.dealership_rank),
    gdLastActivity: toIsoDate(p.rooftop_last_activity),
    numAssociatedContacts: toInt(p.num_associated_contacts),
    numAssociatedDeals: toInt(p.num_associated_deals),
    numUsedCars: toInt(p.number_of_used_cars),
    numNewCars: toInt(p.number_of_new_cars),
    totalCars: toInt(p.total_cars_in_inventory) ?? toInt(p.total_cars),
    numCarsGdLevel: toInt(p.number_of_cars__gd_level_),
    oem: nonEmpty(p.oem_s),
    partnerName: nonEmpty(p.partner_name),
    dmsName: nonEmpty(p.dms_name),
    marketSegment: nonEmpty(p.market_segment),
    tier: nonEmpty(p.tier),
    lastActivityDate: toIsoDate(p.notes_last_contacted),
    createDate: toIsoDate(p.createdate),
    hsLastModifiedDate: toIsoDate(p.hs_lastmodifieddate),
    rawProperties: p,
  };
}
