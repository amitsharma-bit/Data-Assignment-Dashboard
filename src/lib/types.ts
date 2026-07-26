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
  // Best-guess mapping (dealership_rank) — unconfirmed against the live
  // portal, see README "Known open items". Will read as null if wrong.
  dealershipRank: string | null;
  // "GD Last Activity" — mapped to the rooftop_last_activity property,
  // distinct from the company-level lastActivityDate below.
  gdLastActivity: string | null;

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

// Ground truth from the AE Pod roster (src/lib/pods.ts), not a local guess.
export type OwnerRole = "SDR" | "AE";
