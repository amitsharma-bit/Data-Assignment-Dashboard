import type { FilterGroup } from "@/lib/filters/types";

export interface Preset {
  name: string;
  description: string;
  filter: FilterGroup;
}

// Starting points only — every one of these is fully editable in the builder
// once loaded. Owner is deliberately left out of "Assignable Accounts" since
// it's contextual; add a "Company owner is ..." condition after loading it.
export const PRESETS: Preset[] = [
  {
    name: "Assignable Accounts",
    description: "Reproduces the example criteria from the original manual HubSpot workflow.",
    filter: {
      op: "AND",
      conditions: [
        {
          op: "OR",
          conditions: [
            { field: "oem_s", operator: "not_equals", value: "Independent" },
            { field: "oem_s", operator: "is_missing" },
          ],
        },
        { field: "gd_name", operator: "is_missing" },
        { field: "country", operator: "equals", value: "United States" },
        { field: "num_associated_contacts", operator: "greater_than", value: 2 },
        { field: "website_status", operator: "equals", value: "Relevant" },
        { field: "number_of_used_cars", operator: "between", value: [60, 200] },
        { field: "dms_name", operator: "not_equals", value: "Carsforsale.Com" },
        {
          field: "lifecycle_stage_gd_level",
          operator: "not_in",
          value: ["In Pipeline", "Contract Closed"],
        },
      ],
    },
  },
  {
    name: "High Potential",
    description: "Group dealerships with strong used-car inventory.",
    filter: {
      op: "AND",
      conditions: [
        { field: "is_this_is_a_part_of_group_dealership_", operator: "equals", value: true },
        { field: "number_of_used_cars", operator: "greater_than", value: 100 },
      ],
    },
  },
  {
    name: "Needs Review",
    description: "Missing key qualifying data before an assignability decision can be made.",
    filter: {
      op: "OR",
      conditions: [
        { field: "website_status", operator: "is_missing" },
        { field: "gd_name", operator: "is_missing" },
        { field: "num_associated_contacts", operator: "is_missing" },
      ],
    },
  },
];
