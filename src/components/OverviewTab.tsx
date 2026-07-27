import { useMemo, useState } from "react";
import { Leaderboard } from "./Leaderboard";
import { CompanyDrawer } from "./CompanyDrawer";
import { Avatar } from "./ui/Avatar";
import { SortableHeader, toggleSort as toggleSortHelper, type SortDirection } from "./ui/SortableHeader";
import { getDistinctPods, podForOwner, roleForOwner } from "@/lib/pods";
import type { RosterOverrideMap } from "@/lib/rosterOverrides";
import type { CompanyRecord, OwnerRecord, OwnerRole, TeamRecord } from "@/lib/types";

type RoleFilter = "All" | OwnerRole;
type SortField = "name" | "domain" | "owner" | "gdName" | "potentialRooftops";

const COLUMNS: { field: SortField; label: string }[] = [
  { field: "name", label: "Company Name" },
  { field: "domain", label: "Company Domain Name" },
  { field: "owner", label: "Company Owner" },
  { field: "gdName", label: "GD Name" },
  { field: "potentialRooftops", label: "Potential Rooftops" },
];

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
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);

  const scopedCompanies = useMemo(
    () =>
      companies.filter((c) => {
        const pod = podForOwner(c.ownerId, ownerMap, rosterOverrides);
        return selectedPod ? pod === selectedPod : pod !== null;
      }),
    [companies, selectedPod, ownerMap, rosterOverrides],
  );

  const ownerOptions = useMemo(() => {
    const ids = new Set(scopedCompanies.map((c) => c.ownerId).filter((id): id is string => Boolean(id)));
    return [...ids]
      .map((id) => ownerMap.get(id))
      .filter((o): o is OwnerRecord => Boolean(o?.name))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [scopedCompanies, ownerMap]);

  const filtered = useMemo(() => {
    let rows = scopedCompanies;
    if (roleFilter !== "All") {
      rows = rows.filter((c) => roleForOwner(c.ownerId, ownerMap, rosterOverrides) === roleFilter);
    }
    if (ownerFilter) {
      rows = rows.filter((c) => c.ownerId === ownerFilter);
    }
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter(
        (c) => c.name?.toLowerCase().includes(needle) || c.gdName?.toLowerCase().includes(needle),
      );
    }
    return rows;
  }, [scopedCompanies, roleFilter, ownerFilter, search, ownerMap, rosterOverrides]);

  const visible = useMemo(() => {
    if (!sortField) return filtered;
    const valueOf = (c: CompanyRecord): string | number | null => {
      switch (sortField) {
        case "name":
          return c.name;
        case "domain":
          return c.domain;
        case "owner":
          return ownerMap.get(c.ownerId ?? "")?.name ?? c.ownerId;
        case "gdName":
          return c.gdName;
        case "potentialRooftops":
          return c.potentialRooftops;
      }
    };
    const sorted = [...filtered].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [filtered, sortField, sortDirection, ownerMap]);

  function toggleSort(field: SortField) {
    toggleSortHelper(field, sortField, sortDirection, setSortField, setSortDirection);
  }

  const showTable = Boolean(selectedPod || search.trim() || ownerFilter);

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
        <select className="input" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
          <option value="">All company owners</option>
          {ownerOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <div className="segmented">
          {(["All", "SDR", "AE"] as RoleFilter[]).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)} className={roleFilter === r ? "segmented-item-active" : "segmented-item"}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {!showTable ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Select a pod above, or search / pick an owner, to see accounts.
        </div>
      ) : (
        <>
          <div className="mb-2 text-sm text-slate-500">{visible.length.toLocaleString()} accounts</div>
          <div className="table-shell">
            <table className="table-fixed">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <SortableHeader
                      key={col.field}
                      label={col.label}
                      field={col.field}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="w-1/5"
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => setSelectedCompany(c)}>
                    <td className="truncate font-medium text-slate-900">{c.name ?? "—"}</td>
                    <td className="truncate">{c.domain ?? "—"}</td>
                    <td className="truncate">
                      <span className="flex items-center gap-2">
                        <Avatar id={c.ownerId ?? "?"} name={ownerMap.get(c.ownerId ?? "")?.name ?? null} />
                        <span className="truncate">{ownerMap.get(c.ownerId ?? "")?.name ?? c.ownerId ?? "—"}</span>
                      </span>
                    </td>
                    <td className="truncate">{c.gdName ?? "—"}</td>
                    <td className="truncate">{c.potentialRooftops ?? "—"}</td>
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
