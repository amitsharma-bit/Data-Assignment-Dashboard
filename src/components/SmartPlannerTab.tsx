import { useMemo, useState } from "react";
import { AssignToControl } from "./AssignToControl";
import { CompanyDrawer } from "./CompanyDrawer";
import { SortableHeader, toggleSort as toggleSortHelper, type SortDirection } from "./ui/SortableHeader";
import { findSalesopsOwner } from "@/lib/salesops";
import { sortCompanies } from "@/lib/filters/engine";
import type { RosterOverrideMap } from "@/lib/rosterOverrides";
import type { CompanyRecord, OwnerRecord, TeamRecord } from "@/lib/types";

const EXCLUDABLE_LIFECYCLE_STAGES = ["Contract Closed", "In Pipeline"];

const COLUMNS: { field: string; label: string }[] = [
  { field: "name", label: "Company Name" },
  { field: "domain", label: "Domain" },
  { field: "gd_name", label: "GD Name" },
  { field: "num_associated_contacts", label: "Contacts" },
  { field: "number_of_used_cars", label: "Used Cars" },
  { field: "number_of_new_cars", label: "New Cars" },
  { field: "total_cars", label: "Total Cars" },
  { field: "lifecycle_stage_gd_level", label: "Lifecycle (GD Level)" },
  { field: "oem_s", label: "OEM" },
  { field: "country", label: "Country" },
];

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
  const [sortField, setSortField] = useState<string | null>("num_associated_contacts");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
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
    return sortCompanies(filtered, sortField ?? undefined, sortDirection);
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
    toggleSortHelper(field, sortField, sortDirection, setSortField, setSortDirection);
  }

  function selectAllVisible() {
    setSelected(new Set(matches.map((c) => c.id)));
  }

  if (!salesopsOwner) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Smart Assignment Planner</h1>
        <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900">
          Couldn't find an owner named "Salesops ." in the synced owner list. Sync first if you haven't.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Smart Assignment Planner</h1>
      <p className="mb-4 text-sm text-slate-500">
        Scans every company owned by "{salesopsOwner.name}" ({pool.length.toLocaleString()} total) against the
        criteria below to surface the best candidates to hand out.
      </p>

      <div className="card mb-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Minimum associated contacts</label>
            <input
              type="number"
              min={0}
              className="input w-full"
              value={minContacts}
              onChange={(e) => setMinContacts(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Minimum used cars (manual — blank = no minimum)</label>
            <input
              type="number"
              min={0}
              className="input w-full"
              placeholder="No minimum"
              value={minUsedCars}
              onChange={(e) => setMinUsedCars(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Country</label>
            <select className="input w-full" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">All countries</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Exclude lifecycle stage (GD level)</label>
            <div className="flex flex-wrap gap-3 pt-1.5">
              {EXCLUDABLE_LIFECYCLE_STAGES.map((stage) => (
                <label key={stage} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input type="checkbox" className="accent-indigo-600" checked={excludedStages.has(stage)} onChange={() => toggleStage(stage)} />
                  {stage}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">OEM</label>
            <label className="flex items-center gap-1.5 pt-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                className="accent-indigo-600"
                checked={excludeIndependentOem}
                onChange={(e) => setExcludeIndependentOem(e.target.checked)}
              />
              Exclude Independent OEM
            </label>
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="badge-emerald">{matches.length.toLocaleString()} companies match</span>
        <button onClick={selectAllVisible} className="text-sm font-medium text-indigo-600 hover:underline">
          Select all visible
        </button>
        <button onClick={() => setSelected(new Set())} className="text-sm text-slate-500 hover:underline">
          Clear selection
        </button>
        <div className="ml-auto">
          <AssignToControl count={selected.size} owners={owners} onAssign={(ownerId) => onReassign([...selected], ownerId)} />
        </div>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th className="w-8" />
              {COLUMNS.map((col) => (
                <SortableHeader
                  key={col.field}
                  label={col.label}
                  field={col.field}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {matches.map((c) => (
              <tr key={c.id}>
                <td>
                  <input type="checkbox" className="accent-indigo-600" checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} />
                </td>
                <td className="cursor-pointer font-medium text-slate-900" onClick={() => setSelectedCompany(c)}>
                  {c.name ?? "—"}
                </td>
                <td>{c.domain ?? "—"}</td>
                <td>{c.gdName ?? "—"}</td>
                <td>{c.numAssociatedContacts ?? "—"}</td>
                <td>{c.numUsedCars ?? "—"}</td>
                <td>{c.numNewCars ?? "—"}</td>
                <td>{c.totalCars ?? "—"}</td>
                <td>{c.lifecycleStageGdLevel ?? "—"}</td>
                <td>{c.oem ?? "—"}</td>
                <td>{c.country ?? "—"}</td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
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
