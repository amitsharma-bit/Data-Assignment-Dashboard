import type { RosterOverrideMap } from "./rosterOverrides";
import type { OwnerRecord, OwnerRole } from "./types";

export interface RosterEntry {
  name: string;
  role: OwnerRole;
  pod: string | null; // null = unassigned ("—" in the source roster)
}

/**
 * The real account-grouping structure ("AE Pods") — distinct from HubSpot's
 * built-in Teams feature, which isn't used for this at all. Names below are
 * matched against synced HubSpot owner names (trim/case-insensitive) —
 * anyone who doesn't match shows up as "Unassigned" rather than silently
 * disappearing, so mismatches are visible instead of hidden. If someone
 * shows up Unassigned who shouldn't be, check their exact name in HubSpot
 * (Settings > Users) and correct it here — the roster's display name isn't
 * always what HubSpot has on file (e.g. "Namrata Sharma" below was
 * originally listed as "Nam Harrison").
 *
 * This static list is the seed/fallback only — anything set via the Admin
 * Control Center tab is stored as a RosterOverride (src/lib/rosterOverrides.ts)
 * and takes precedence over what's here. Edit this file only for baseline
 * corrections; day-to-day pod changes should go through that tab instead.
 *
 * The "Shashank" pod was retired (Shashank is no longer in the system).
 * Its former members were redistributed: Vans K -> Neelima, Ankur Patel ->
 * Saarthak. Mayank Joshi wasn't given a new pod, so he's Unassigned until
 * reassigned via Admin Control Center.
 */
export const POD_ROSTER: RosterEntry[] = [
  { name: "Ankur Patel", role: "AE", pod: "Saarthak" },
  { name: "Anmol Sehgal", role: "AE", pod: "Archit" },
  { name: "Archit Gupta", role: "AE", pod: "Archit" },
  { name: "Arun Divya Prakash", role: "AE", pod: "Neelima" },
  { name: "Jace Larsen", role: "AE", pod: "Archit" },
  { name: "Jatin Arora", role: "AE", pod: "Neelima" },
  { name: "Jay Berry", role: "AE", pod: "Saarthak" },
  { name: "Liam Fallon", role: "AE", pod: "Archit" },
  { name: "Mayank Joshi", role: "AE", pod: null },
  { name: "Neelima Tiwari", role: "AE", pod: "Neelima" },
  { name: "Pallav Pandey", role: "AE", pod: "Neelima" },
  { name: "Prince Arora", role: "AE", pod: "Prince" },
  { name: "Saurabh Nawale", role: "AE", pod: "Prince" },
  { name: "Shivam Ahuja", role: "AE", pod: "Saarthak" },
  { name: "Vans K", role: "AE", pod: "Neelima" },

  { name: "Abhishek Bhattacharyya", role: "SDR", pod: null },
  { name: "Angad Bawa", role: "SDR", pod: "Prince" },
  { name: "Animesh Anand", role: "SDR", pod: "Central" },
  { name: "Anisha Jaiswal", role: "SDR", pod: "Neelima" },
  { name: "Ashish Baweja", role: "SDR", pod: "Saarthak" },
  { name: "Divyansh Gupta", role: "SDR", pod: "Prince" },
  { name: "Drishti Aggarwal", role: "SDR", pod: "Archit" },
  { name: "Gagandeep Kaur", role: "SDR", pod: null },
  { name: "Jayant Trivedi", role: "SDR", pod: "Archit" },
  { name: "Ketan Srivastava", role: "SDR", pod: "Prince" },
  { name: "Khubaib Akram Khan", role: "SDR", pod: "Prince" },
  { name: "Kreeti Chhabra", role: "SDR", pod: null },
  { name: "Kshitij Agarwal", role: "SDR", pod: "Neelima" },
  { name: "Lakshya Gaurh", role: "SDR", pod: null },
  { name: "Namrata Sharma", role: "SDR", pod: "Saarthak" }, // roster said "Nam Harrison" — corrected to her actual HubSpot name
  { name: "Palak Narula", role: "SDR", pod: "Prince" },
  { name: "Prabhjeet Kaur", role: "SDR", pod: "Saarthak" },
  { name: "Priyanka Sambyal", role: "SDR", pod: "Neelima" },
  { name: "Rajveer Singh", role: "SDR", pod: "Archit" },
  { name: "Rishabh Sharma", role: "SDR", pod: null },
  { name: "Sanamdeep .", role: "SDR", pod: "Archit" },
  { name: "Shadman Khalid", role: "SDR", pod: "Central" },
  { name: "Shikhar Paroha", role: "SDR", pod: "Neelima" },
  { name: "Shubham Singha.", role: "SDR", pod: "Neelima" },
  { name: "Simran Grover", role: "SDR", pod: "Neelima" },
  { name: "Sourav Singh", role: "SDR", pod: "Central" },
  { name: "utsav Yadav", role: "SDR", pod: "Neelima" },
  { name: "Vaansh Sharma", role: "SDR", pod: "Archit" },
  { name: "Vaibhav Kumar", role: "SDR", pod: null },
  { name: "Vikram Choudhary", role: "SDR", pod: "Saarthak" },
  { name: "Viplove Tyagi", role: "SDR", pod: null },
];

/** Display order for the leaderboard, matching the "AE Pods" panel. */
export const POD_ORDER = ["Saarthak", "Neelima", "Archit", "Prince", "Central"];

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

const ROSTER_BY_NAME = new Map(POD_ROSTER.map((entry) => [normalize(entry.name), entry]));

function rosterEntryForOwnerName(name: string | null | undefined): RosterEntry | undefined {
  if (!name) return undefined;
  return ROSTER_BY_NAME.get(normalize(name));
}

export function podForOwner(
  ownerId: string | null | undefined,
  ownersById: Map<string, OwnerRecord>,
  overrides: RosterOverrideMap = {},
): string | null {
  if (!ownerId) return null;
  const override = overrides[ownerId];
  if (override) return override.pod;
  return rosterEntryForOwnerName(ownersById.get(ownerId)?.name)?.pod ?? null;
}

export function roleForOwner(
  ownerId: string | null | undefined,
  ownersById: Map<string, OwnerRecord>,
  overrides: RosterOverrideMap = {},
): OwnerRole | null {
  if (!ownerId) return null;
  const override = overrides[ownerId];
  if (override) return override.role;
  return rosterEntryForOwnerName(ownersById.get(ownerId)?.name)?.role ?? null;
}

/** All pods that actually have at least one member, in display order. */
export function getDistinctPods(overrides: RosterOverrideMap = {}): string[] {
  const present = new Set(POD_ROSTER.map((r) => r.pod).filter((p): p is string => Boolean(p)));
  for (const override of Object.values(overrides)) {
    if (override.pod) present.add(override.pod);
  }
  const ordered = POD_ORDER.filter((p) => present.has(p));
  const extra = [...present].filter((p) => !POD_ORDER.includes(p)).sort();
  return [...ordered, ...extra];
}
