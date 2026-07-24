import type { FilterGroup } from "./filters/types";

export interface CompanyRecord {
  id: string;
  name: string | null;
  domain: string | null;
  city: string | null;
  state: string | null;
  country: string | null;

  ownerId: string | null;
  teamId: string | null;
  ownerAssignedDate: string | null; // ISO date

  lifecycleStage: string | null;
  lifecycleStageGdLevel: string | null;
  websiteStatus: string | null;

  gdName: string | null;
  gdId: string | null;
  isGroupDealership: boolean | null;
  dealershipGroupName: string | null;
  potentialRooftops: number | null;
  rooftopsInGroup: number | null;

  numAssociatedContacts: number | null;
  numAssociatedDeals: number | null;

  numUsedCars: number | null;
  numNewCars: number | null;
  totalCars: number | null;
  numCarsGdLevel: number | null;

  oem: string | null;
  partnerName: string | null;
  dmsName: string | null;
  marketSegment: string | null;
  tier: string | null;

  lastActivityDate: string | null;
  createDate: string | null;
  hsLastModifiedDate: string | null;

  rawProperties: Record<string, string | null>;
}

export interface OwnerRecord {
  id: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
}

export interface TeamRecord {
  id: string;
  name: string | null;
}

export type ScoreBand = "highly_assignable" | "good_candidate" | "needs_review" | "poor_candidate";

export interface ScoreReason {
  signal: string;
  points: number;
  description: string;
}

export interface Disqualifier {
  name: string;
  reason: string;
}

export interface ScoredCompany extends CompanyRecord {
  score: number;
  scoreBand: ScoreBand;
  scoreReasons: ScoreReason[];
  disqualifiers: Disqualifier[];
}

export interface SavedFilterRecord {
  id: string;
  name: string;
  filter: FilterGroup;
  createdAt: string;
}
