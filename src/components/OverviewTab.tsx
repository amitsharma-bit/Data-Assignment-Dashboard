import { useMemo, useState } from "react";
import { Leaderboard } from "./Leaderboard";
import { CompanyDrawer } from "./CompanyDrawer";
import { Avatar } from "./ui/Avatar";
import { getDistinctPods, podForOwner, roleForOwner } from "@/lib/pods";
import type { RosterOverrideMap } from "@/lib/rosterOverrides";
import type { CompanyRecord, OwnerRecord, OwnerRole, TeamRecord } from "@/lib/types";

type RoleFilter = "All" | OwnerRole;

export function OverviewTab({
  companies,
  ownerMap,
  teamMap,
  rosterOverrides,
}: {
  companies: CompanyRecord[];
  ownerMap: Map<string, OwnerRecord>;
  teamMap: Map<string, TeamRecord>;
  rosterOverrides: RosterOverrideMap;
}) {
  const pods = useMemo(() => getDistinctPods(rosterOverrides), [rosterOverrides]);

  const [selectedPod, setSelectedPod] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);

  const scopedCompanies = useMemo(
    () =>
      companies.filter((c) => {
        const pod = podForOwner(c.ownerId, ownerMap, rosterOverrides);
        return selectedPod ? pod === selectedPod : pod !== null;
      }),
    [companies, selectedPod, ownerMap, rosterOverrides],
  );

  const visible = useMemo(() => {
    let rows = scopedCompanies;
    if (roleFilter !== "All") {
      rows = rows.filter((c) => roleForOwner(c.ownerId, ownerMap, rosterOverrides) === roleFilter);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter(
        (c) => c.name?.toLowerCase().includes(needle) || c.gdName?.toLowerCase().includes(needle),
      );
    }
    return rows;
  }, [scopedCompanies, roleFilter, search, ownerMap, rosterOverrides]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Overview</h1>

      <Leaderboard
        pods={pods}
        companies={companies}
        ownersById={ownerMap}
        rosterOverrides={rosterOverrides}
        selectedPod={selectedPod}
        onSelectPod={setSelectedPod}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input w-72"
          placeholder="Search any company or group..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="segmented">
          {(["All", "SDR", "AE"] as RoleFilter[]).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)} className={roleFilter === r ? "segmented-item-active" : "segmented-item"}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {!selectedPod && !search.trim() ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Select a pod above, or search, to see accounts.
        </div>
      ) : (
        <>
          <div className="mb-2 text-sm text-slate-500">{visible.length.toLocaleString()} accounts</div>
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Company Domain Name</th>
                  <th>Company Owner</th>
                  <th>GD Name</th>
                  <th>Potential Rooftops</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => setSelectedCompany(c)}>
                    <td className="font-medium text-slate-900">{c.name ?? "—"}</td>
                    <td>{c.domain ?? "—"}</td>
                    <td>
                      <span className="flex items-center gap-2">
                        <Avatar id={c.ownerId ?? "?"} name={ownerMap.get(c.ownerId ?? "")?.name ?? null} />
                        {ownerMap.get(c.ownerId ?? "")?.name ?? c.ownerId ?? "—"}
                      </span>
                    </td>
                    <td>{c.gdName ?? "—"}</td>
                    <td>{c.potentialRooftops ?? "—"}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No accounts match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CompanyDrawer
        company={selectedCompany}
        owners={ownerMap}
        teams={teamMap}
        rosterOverrides={rosterOverrides}
        onClose={() => setSelectedCompany(null)}
      />
    </div>
  );
}
