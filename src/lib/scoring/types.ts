import type { FilterCondition } from "@/lib/filters/types";
import type { ScoreBand } from "@/lib/types";

export interface WeightedSignal {
  name: string;
  condition: FilterCondition;
  points: number;
  description: string;
}

export interface HardDisqualifier {
  name: string;
  condition: FilterCondition;
  reason: string;
}

export interface BandRange {
  min: number;
  max: number;
}

export type BandThresholds = Record<ScoreBand, BandRange>;

export interface ScoringConfig {
  basePoints: number;
  bandThresholds: BandThresholds;
  hardDisqualifiers: HardDisqualifier[];
  weightedSignals: WeightedSignal[];
}

export const BAND_LABELS: Record<ScoreBand, string> = {
  highly_assignable: "Highly assignable",
  good_candidate: "Good candidate",
  needs_review: "Needs review",
  poor_candidate: "Poor candidate",
};

export const BAND_ORDER: ScoreBand[] = ["highly_assignable", "good_candidate", "needs_review", "poor_candidate"];

/**
 * Defaults straight from the original plan's example scoring framework —
 * fully editable afterward in the Admin tab, nothing here is hardcoded
 * against your data at runtime.
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  basePoints: 50,
  bandThresholds: {
    highly_assignable: { min: 90, max: 100 },
    good_candidate: { min: 70, max: 89 },
    needs_review: { min: 40, max: 69 },
    poor_candidate: { min: 0, max: 39 },
  },
  hardDisqualifiers: [
    {
      name: "independent_oem",
      condition: { field: "oem_s", operator: "equals", value: "Independent" },
      reason: "OEM is Independent",
    },
    {
      name: "blocked_dms",
      condition: { field: "dms_name", operator: "equals", value: "Carsforsale.Com" },
      reason: "DMS is Carsforsale.Com",
    },
    {
      name: "blocked_lifecycle",
      condition: {
        field: "lifecycle_stage_gd_level",
        operator: "in",
        value: ["In Pipeline", "Contract Closed"],
      },
      reason: "Lifecycle stage (GD level) is not eligible",
    },
  ],
  weightedSignals: [
    {
      name: "relevant_website",
      condition: { field: "website_status", operator: "equals", value: "Relevant" },
      points: 15,
      description: "Website status is Relevant",
    },
    {
      name: "missing_gd_name",
      condition: { field: "gd_name", operator: "is_missing" },
      points: 10,
      description: "GD name is blank",
    },
    {
      name: "healthy_used_cars",
      condition: { field: "number_of_used_cars", operator: "between", value: [60, 200] },
      points: 15,
      description: "Used car inventory is in the healthy 60-200 range",
    },
    {
      name: "enough_contacts",
      condition: { field: "num_associated_contacts", operator: "greater_than", value: 2 },
      points: 10,
      description: "More than 2 associated contacts",
    },
    {
      name: "us_geography",
      condition: { field: "country", operator: "equals", value: "United States" },
      points: 5,
      description: "Country is United States",
    },
    {
      name: "group_dealership",
      condition: { field: "is_this_is_a_part_of_group_dealership_", operator: "equals", value: true },
      points: 5,
      description: "Part of a group dealership",
    },
  ],
};
