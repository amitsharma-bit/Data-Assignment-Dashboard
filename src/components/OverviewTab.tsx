import { useEffect, useMemo, useState } from "react";
import { Leaderboard } from "./Leaderboard";
import { CompanyDrawer } from "./CompanyDrawer";
import { getSalesTeams } from "@/lib/teams";
import { loadOwnerRoles, roleOf, saveOwnerRoles } from "@/lib/ownerRoles";
import type { CompanyRecord, OwnerRecord, OwnerRole, OwnerRoleMap, TeamRecord } from "@/lib/types";

type RoleFilter = "All" | OwnerRole;

export function OverviewTab({
  companies,
  owners,
  teams,
  ownerMap,
  teamMap,
}: {
  companies: CompanyRecord[];
  owners: OwnerRecord[];
  teams: TeamRecord[];
  ownerMap: Map<string, OwnerRecord>;
  teamMap: Map<string, TeamRecord>;
}) {
  const salesTeams = useMemo(() => getSalesTeams(teams), [teams]);
  const salesTeamIds = useMemo(() => new Set(salesTeams.map((t) => t.id)), [salesTeams]);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [ownerRoles, setOwnerRoles] = useState<OwnerRoleMap>({});
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);

  useEffect(() => {
    loadOwnerRoles().then(setOwnerRoles);
  }, []);

  const scopedCompanies = useMemo(
    () => companies.filter((c) => (selectedTeamId ? c.teamId === selectedTeamId : c.teamId && salesTeamIds.has(c.teamId))),
    [companies, selectedTeamId, salesTeamIds],
  );

  const visible = useMemo(() => {
    let rows = scopedCompanies;
    if (roleFilter !== "All") {
      rows = rows.filter((c) => roleOf(c.ownerId, ownerRoles) === roleFilter);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter(
        (c) => c.name?.toLowerCase().includes(needle) || c.gdName?.toLowerCase().includes(needle),
      );
    }
    return rows;
  }, [scopedCompanies, roleFilter, search, ownerRoles]);

  const ownersInScope = useMemo(() => {
    const ids = new Set(scopedCompanies.map((c) => c.ownerId).filter((id): id is string => Boolean(id)));
    return owners.filter((o) => ids.has(o.id)).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [scopedCompanies, owners]);

  async function updateRole(ownerId: string, role: OwnerRole) {
    const next = { ...ownerRoles, [ownerId]: role };
    setOwnerRoles(next);
    await saveOwnerRoles(next);
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Overview</h1>

      <Leaderboard teams={salesTeams} companies={companies} selectedTeamId={selectedTeamId} onSelectTeam={setSelectedTeamId} />

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
        <button onClick={() => setShowRoleManager((v) => !v)} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100">
          Manage team roles
        </button>
      </div>

      {showRoleManager && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Owner tags</h2>
          <p className="mb-3 text-xs text-gray-500">
            Tag each owner as SDR or AE/Manager — used by the filter buttons above. Stored in this browser only.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ownersInScope.map((owner) => (
              <div key={owner.id} className="flex items-center justify-between gap-2 rounded border px-2 py-1">
                <span className="truncate text-sm">{owner.name ?? owner.id}</span>
                <select
                  className="rounded border px-1 py-0.5 text-xs"
                  value={roleOf(owner.id, ownerRoles)}
                  onChange={(e) => updateRole(owner.id, e.target.value as OwnerRole)}
                >
                  <option value="AE">AE/Manager</option>
                  <option value="SDR">SDR</option>
                </select>
              </div>
            ))}
            {ownersInScope.length === 0 && <p className="text-sm text-gray-400">No owners in scope yet.</p>}
          </div>
        </div>
      )}

      {!selectedTeamId && !search.trim() ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
          Select a team above, or search, to see accounts.
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
