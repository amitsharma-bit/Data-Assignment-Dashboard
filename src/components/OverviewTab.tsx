import { useMemo, useState } from "react";
import { Leaderboard } from "./Leaderboard";
import { CompanyDrawer } from "./CompanyDrawer";
import { getDistinctPods, podForOwner, roleForOwner } from "@/lib/pods";
import type { CompanyRecord, OwnerRecord, OwnerRole, TeamRecord } from "@/lib/types";

type RoleFilter = "All" | OwnerRole;

export function OverviewTab({
  companies,
  ownerMap,
  teamMap,
}: {
  companies: CompanyRecord[];
  ownerMap: Map<string, OwnerRecord>;
  teamMap: Map<string, TeamRecord>;
}) {
  const pods = useMemo(() => getDistinctPods(), []);

  const [selectedPod, setSelectedPod] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);

  const scopedCompanies = useMemo(
    () =>
      companies.filter((c) => {
        const pod = podForOwner(c.ownerId, ownerMap);
        return selectedPod ? pod === selectedPod : pod !== null;
      }),
    [companies, selectedPod, ownerMap],
  );

  const visible = useMemo(() => {
    let rows = scopedCompanies;
    if (roleFilter !== "All") {
      rows = rows.filter((c) => roleForOwner(c.ownerId, ownerMap) === roleFilter);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter(
        (c) => c.name?.toLowerCase().includes(needle) || c.gdName?.toLowerCase().includes(needle),
      );
    }
    return rows;
  }, [scopedCompanies, roleFilter, search, ownerMap]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Overview</h1>

      <Leaderboard pods={pods} companies={companies} ownersById={ownerMap} selectedPod={selectedPod} onSelectPod={setSelectedPod} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="w-72 rounded border px-2 py-1.5 text-sm"
          placeholder="Search any company or group..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex rounded border">
          {(["All", "SDR", "AE"] as RoleFilter[]).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-sm ${roleFilter === r ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {!selectedPod && !search.trim() ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
          Select a pod above, or search, to see accounts.
        </div>
      ) : (
        <>
          <div className="mb-2 text-sm text-gray-600">{visible.length.toLocaleString()} accounts</div>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Company Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Company Domain Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Company Owner</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">GD Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Potential Rooftops</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className="cursor-pointer border-b hover:bg-gray-50" onClick={() => setSelectedCompany(c)}>
                    <td className="px-3 py-2">{c.name ?? "—"}</td>
                    <td className="px-3 py-2">{c.domain ?? "—"}</td>
                    <td className="px-3 py-2">{ownerMap.get(c.ownerId ?? "")?.name ?? c.ownerId ?? "—"}</td>
                    <td className="px-3 py-2">{c.gdName ?? "—"}</td>
                    <td className="px-3 py-2">{c.potentialRooftops ?? "—"}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                      No accounts match.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <CompanyDrawer company={selectedCompany} owners={ownerMap} teams={teamMap} onClose={() => setSelectedCompany(null)} />
    </div>
  );
}
