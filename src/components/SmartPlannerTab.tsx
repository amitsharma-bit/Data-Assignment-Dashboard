import { useMemo, useState } from "react";
import { AssignToControl } from "./AssignToControl";
import { CompanyDrawer } from "./CompanyDrawer";
import { findSalesopsOwner } from "@/lib/salesops";
import { sortCompanies } from "@/lib/filters/engine";
import type { RosterOverrideMap } from "@/lib/rosterOverrides";
import type { CompanyRecord, OwnerRecord, TeamRecord } from "@/lib/types";

const EXCLUDABLE_LIFECYCLE_STAGES = ["Contract Closed", "In Pipeline"];

export function SmartPlannerTab({
  companies,
  owners,
  ownerMap,
  teamMap,
  rosterOverrides,
  onReassign,
}: {
  companies: CompanyRecord[];
  owners: OwnerRecord[];
  ownerMap: Map<string, OwnerRecord>;
  teamMap: Map<string, TeamRecord>;
  rosterOverrides: RosterOverrideMap;
  onReassign: (companyIds: string[], newOwnerId: string) => Promise<void>;
}) {
  const salesopsOwner = useMemo(() => findSalesopsOwner(owners), [owners]);
  const pool = useMemo(
    () => (salesopsOwner ? companies.filter((c) => c.ownerId === salesopsOwner.id) : []),
    [companies, salesopsOwner],
  );
  const countryOptions = useMemo(
    () => [...new Set(pool.map((c) => c.country).filter((v): v is string => Boolean(v)))].sort(),
    [pool],
  );

  const [minContacts, setMinContacts] = useState(2);
  const [minUsedCars, setMinUsedCars] = useState<number | "">("");
  const [excludedStages, setExcludedStages] = useState<Set<string>>(new Set(EXCLUDABLE_LIFECYCLE_STAGES));
  const [excludeIndependentOem, setExcludeIndependentOem] = useState(true);
  const [country, setCountry] = useState(() => (countryOptions.includes("United States") ? "United States" : ""));
  const [sortField, setSortField] = useState("num_associated_contacts");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);

  const matches = useMemo(() => {
    const filtered = pool.filter((c) => {
      if ((c.numAssociatedContacts ?? 0) < minContacts) return false;
      if (minUsedCars !== "" && (c.numUsedCars ?? 0) < minUsedCars) return false;
      if (c.lifecycleStageGdLevel && excludedStages.has(c.lifecycleStageGdLevel)) return false;
      if (excludeIndependentOem && c.oem === "Independent") return false;
      if (country && c.country !== country) return false;
      return true;
    });
    return sortCompanies(filtered, sortField, sortDirection);
  }, [pool, minContacts, minUsedCars, excludedStages, excludeIndependentOem, country, sortField, sortDirection]);

  function toggleStage(stage: string) {
    const next = new Set(excludedStages);
    if (next.has(stage)) next.delete(stage);
    else next.add(stage);
    setExcludedStages(next);
  }

  function toggleSelected(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSort(field: string) {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  function selectAllVisible() {
    setSelected(new Set(matches.map((c) => c.id)));
  }

  if (!salesopsOwner) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-2 text-xl font-semibold">Smart Assignment Planner</h1>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Couldn't find an owner named "Salesops ." in the synced owner list. Sync first if you haven't.
        </div>
      </div>
    );
  }

  const sortHeader = (label: string, field: string) => (
    <th onClick={() => toggleSort(field)} className="cursor-pointer px-3 py-2 text-left font-medium text-gray-700 hover:underline">
      {label}
      {sortField === field && (sortDirection === "asc" ? " ▲" : " ▼")}
    </th>
  );

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Smart Assignment Planner</h1>
      <p className="mb-4 text-sm text-gray-500">
        Scans every company owned by "{salesopsOwner.name}" ({pool.length.toLocaleString()} total) against the
        criteria below to surface the best candidates to hand out.
      </p>

      <div className="mb-4 rounded-lg border bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Minimum associated contacts</label>
            <input
              type="number"
              min={0}
              className="w-full rounded border px-2 py-1.5 text-sm"
              value={minContacts}
              onChange={(e) => setMinContacts(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Minimum used cars (manual — blank = no minimum)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="No minimum"
              value={minUsedCars}
              onChange={(e) => setMinUsedCars(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Country</label>
            <select className="w-full rounded border px-2 py-1.5 text-sm" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All countries</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Exclude lifecycle stage (GD level)</label>
            <div className="flex flex-wrap gap-3 pt-1.5">
              {EXCLUDABLE_LIFECYCLE_STAGES.map((stage) => (
                <label key={stage} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={excludedStages.has(stage)} onChange={() => toggleStage(stage)} />
                  {stage}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">OEM</label>
            <label className="flex items-center gap-1.5 pt-1.5 text-sm">
              <input type="checkbox" checked={excludeIndependentOem} onChange={(e) => setExcludeIndependentOem(e.target.checked)} />
              Exclude Independent OEM
            </label>
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600">{matches.length.toLocaleString()} companies match</span>
        <button onClick={selectAllVisible} className="text-sm font-medium text-blue-700 hover:underline">
          Select all visible
        </button>
        <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:underline">
          Clear selection
        </button>
        <div className="ml-auto">
          <AssignToControl count={selected.size} owners={owners} onAssign={(ownerId) => onReassign([...selected], ownerId)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2" />
              {sortHeader("Company Name", "name")}
              <th className="px-3 py-2 text-left font-medium text-gray-700">Domain</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">GD Name</th>
              {sortHeader("Contacts", "num_associated_contacts")}
              {sortHeader("Used Cars", "number_of_used_cars")}
              <th className="px-3 py-2 text-left font-medium text-gray-700">New Cars</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Total Cars</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Lifecycle (GD Level)</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">OEM</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Country</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} />
                </td>
                <td className="cursor-pointer px-3 py-2" onClick={() => setSelectedCompany(c)}>
                  {c.name ?? "—"}
                </td>
                <td className="px-3 py-2">{c.domain ?? "—"}</td>
                <td className="px-3 py-2">{c.gdName ?? "—"}</td>
                <td className="px-3 py-2">{c.numAssociatedContacts ?? "—"}</td>
                <td className="px-3 py-2">{c.numUsedCars ?? "—"}</td>
                <td className="px-3 py-2">{c.numNewCars ?? "—"}</td>
                <td className="px-3 py-2">{c.totalCars ?? "—"}</td>
                <td className="px-3 py-2">{c.lifecycleStageGdLevel ?? "—"}</td>
                <td className="px-3 py-2">{c.oem ?? "—"}</td>
                <td className="px-3 py-2">{c.country ?? "—"}</td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-gray-500">
                  No companies meet these criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
