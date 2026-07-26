import type { Operator } from "./types";

export type FieldKind = "string" | "number" | "boolean" | "date";

export interface FieldDef {
  column: string;
  kind: FieldKind;
  label: string;
}

/**
 * Filter field keys match HubSpot's internal property names, so a saved
 * filter tree reads the same way the columns do inside HubSpot itself.
 */
export const FIELD_REGISTRY: Record<string, FieldDef> = {
  name: { column: "name", kind: "string", label: "Company name" },
  domain: { column: "domain", kind: "string", label: "Company domain" },
  city: { column: "city", kind: "string", label: "City" },
  state: { column: "state", kind: "string", label: "State" },
  country: { column: "country", kind: "string", label: "Country" },

  hubspot_owner_id: { column: "ownerId", kind: "string", label: "Company owner" },
  hubspot_team_id: { column: "teamId", kind: "string", label: "HubSpot team" },
  hubspot_owner_assigneddate: {
    column: "ownerAssignedDate",
    kind: "date",
    label: "Owner assigned date",
  },

  lifecyclestage: { column: "lifecycleStage", kind: "string", label: "Lifecycle stage" },
  lifecycle_stage_gd_level: {
    column: "lifecycleStageGdLevel",
    kind: "string",
    label: "Lifecycle stage (GD level)",
  },
  website_status: { column: "websiteStatus", kind: "string", label: "Website status" },

  gd_name: { column: "gdName", kind: "string", label: "GD name" },
  gd_id: { column: "gdId", kind: "string", label: "GD ID" },
  is_this_is_a_part_of_group_dealership_: {
    column: "isGroupDealership",
    kind: "boolean",
    label: "Is part of group dealership?",
  },
  dealership_group_name: {
    column: "dealershipGroupName",
    kind: "string",
    label: "Dealership group name",
  },
  potential_rooftops: { column: "potentialRooftops", kind: "number", label: "Potential rooftops" },
  number_of_rooftops_in_the_dealership_group_: {
    column: "rooftopsInGroup",
    kind: "number",
    label: "# Rooftops in group",
  },
  dealership_rank: { column: "dealershipRank", kind: "string", label: "Dealership rank" },
  rooftop_last_activity: { column: "gdLastActivity", kind: "date", label: "GD last activity" },

  num_associated_contacts: {
    column: "numAssociatedContacts",
    kind: "number",
    label: "Number of associated contacts",
  },
  num_associated_deals: {
    column: "numAssociatedDeals",
    kind: "number",
    label: "Number of associated deals",
  },

  number_of_used_cars: { column: "numUsedCars", kind: "number", label: "Number of used cars" },
  number_of_new_cars: { column: "numNewCars", kind: "number", label: "Number of new cars" },
  total_cars: { column: "totalCars", kind: "number", label: "Total cars" },
  number_of_cars__gd_level_: {
    column: "numCarsGdLevel",
    kind: "number",
    label: "Number of cars (GD level)",
  },

  oem_s: { column: "oem", kind: "string", label: "OEM's" },
  partner_name: { column: "partnerName", kind: "string", label: "Partner name" },
  dms_name: { column: "dmsName", kind: "string", label: "DMS name" },
  market_segment: { column: "marketSegment", kind: "string", label: "Market segment" },
  tier: { column: "tier", kind: "string", label: "Tier" },

  notes_last_contacted: { column: "lastActivityDate", kind: "date", label: "Last activity date" },
  createdate: { column: "createDate", kind: "date", label: "Create date" },
};

/** Which operators make sense per field kind — drives the filter builder UI. */
export const OPERATORS_BY_KIND: Record<FieldKind, Operator[]> = {
  string: ["equals", "not_equals", "contains", "not_contains", "in", "not_in", "has_property", "is_missing"],
  number: ["equals", "not_equals", "greater_than", "less_than", "between", "has_property", "is_missing"],
  boolean: ["equals", "not_equals", "has_property", "is_missing"],
  date: ["equals", "not_equals", "greater_than", "less_than", "between", "has_property", "is_missing"],
};
