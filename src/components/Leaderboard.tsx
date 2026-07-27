import { useMemo } from "react";
import type { CompanyRecord, OwnerRecord } from "@/lib/types";
import { groupByGD } from "@/lib/gdGrouping";
import { podForOwner } from "@/lib/pods";
import type { RosterOverrideMap } from "@/lib/rosterOverrides";

interface PodStats {
  pod: string;
  gdCount: number;
  sfCount: number;
  totalCompanies: number;
}

/**
 * "GD Name is Unknown"/"is Known" here means HubSpot's own filter-operator
 * sense (blank vs. has-any-value) — not the literal string "Unknown". A
 * Single Franchise is a company whose GD name is blank ("is unknown").
 */
function isSingleFranchise(c: CompanyRecord): boolean {
  return !c.gdName || c.gdName.trim() === "";
}

/** Anything with a GD name value at all ("is Known") is a Dealership Group member. */
function isDealershipGroupMember(c: CompanyRecord): boolean {
  return !isSingleFranchise(c);
}

/**
 * Total Companies = Total SF + sum of #Potential Rooftops across each
 * distinct GD (falling back to that GD's linked-record count only when
 * potential rooftops isn't filled in, so a data gap doesn't read as zero).
 */
function statsForPod(
  pod: string,
  companies: CompanyRecord[],
  ownersById: Map<string, OwnerRecord>,
  overrides: RosterOverrideMap,
): PodStats {
  const podCompanies = companies.filter((c) => podForOwner(c.ownerId, ownersById, overrides) === pod);
  const gdGroups = groupByGD(podCompanies, isDealershipGroupMember);
  const sfCompanies = podCompanies.filter(isSingleFranchise);

  const rooftopTotal = gdGroups.reduce((sum, g) => sum + (g.potentialRooftops ?? g.companies.length), 0);

  return {
    pod,
    gdCount: gdGroups.length,
    sfCount: sfCompanies.length,
    totalCompanies: sfCompanies.length + rooftopTotal,
  };
}

export function Leaderboard({
  pods,
  companies,
  ownersById,
  rosterOverrides,
  selectedPod,
  onSelectPod,
}: {
  pods: string[];
  companies: CompanyRecord[];
  ownersById: Map<string, OwnerRecord>;
  rosterOverrides: RosterOverrideMap;
  selectedPod: string | null;
  onSelectPod: (pod: string | null) => void;
}) {
  const stats = useMemo(
    () => pods.map((p) => statsForPod(p, companies, ownersById, rosterOverrides)),
    [pods, companies, ownersById, rosterOverrides],
  );

  return (
    <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
      {stats.map(({ pod, gdCount, sfCount, totalCompanies }) => {
        const selected = selectedPod === pod;
        return (
          <button
            key={pod}
            onClick={() => onSelectPod(selected ? null : pod)}
            className={`rounded-xl border p-4 text-left shadow-sm transition ${
              selected
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${selected ? "text-indigo-100" : "text-slate-500"}`}
              >
                {pod}
              </span>
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  selected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"
                }`}
              >
                ●
              </span>
            </div>
            <div className={`text-2xl font-bold ${selected ? "text-white" : "text-slate-900"}`}>{totalCompanies}</div>
            <div className={`mb-2 text-xs ${selected ? "text-indigo-100" : "text-slate-400"}`}>total companies (w/ rooftops)</div>
            <div className={`flex justify-between text-xs ${selected ? "text-indigo-100" : "text-slate-500"}`}>
              <span>
                GD: <span className="font-medium">{gdCount}</span>
              </span>
              <span>
                SF: <span className="font-medium">{sfCount}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
