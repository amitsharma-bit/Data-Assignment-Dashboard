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
                Single: <span className="font-medium">{singleCount}</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
