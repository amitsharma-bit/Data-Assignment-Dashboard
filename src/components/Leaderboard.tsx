import { useMemo } from "react";
import type { CompanyRecord, OwnerRecord } from "@/lib/types";
import { groupByGD } from "@/lib/gdGrouping";
import { podForOwner } from "@/lib/pods";
import type { RosterOverrideMap } from "@/lib/rosterOverrides";

interface PodStats {
  pod: string;
  gdCount: number;
  singleCount: number;
  totalCompanies: number;
}

function statsForPod(
  pod: string,
  companies: CompanyRecord[],
  ownersById: Map<string, OwnerRecord>,
  overrides: RosterOverrideMap,
): PodStats {
  const podCompanies = companies.filter((c) => podForOwner(c.ownerId, ownersById, overrides) === pod);
  const gdGroups = groupByGD(podCompanies);
  const singleCompanies = podCompanies.filter((c) => c.isGroupDealership !== true);

  const rooftopTotal = gdGroups.reduce((sum, g) => sum + (g.potentialRooftops ?? g.companies.length), 0);

  return {
    pod,
    gdCount: gdGroups.length,
    singleCount: singleCompanies.length,
    totalCompanies: rooftopTotal + singleCompanies.length,
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
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map(({ pod, gdCount, singleCount, totalCompanies }) => {
        const selected = selectedPod === pod;
        return (
          <button
            key={pod}
            onClick={() => onSelectPod(selected ? null : pod)}
            className={`rounded-lg border p-4 text-left transition ${
              selected ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white hover:border-gray-400"
            }`}
          >
            <div className="mb-2 text-sm font-semibold">{pod}</div>
            <div className="space-y-0.5 text-xs">
              <div className={selected ? "text-gray-300" : "text-gray-500"}>
                Group Dealerships: <span className="font-medium">{gdCount}</span>
              </div>
              <div className={selected ? "text-gray-300" : "text-gray-500"}>
                Single Accounts: <span className="font-medium">{singleCount}</span>
              </div>
              <div className={selected ? "text-gray-300" : "text-gray-500"}>
                Total Companies (w/ rooftops): <span className="font-medium">{totalCompanies}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
