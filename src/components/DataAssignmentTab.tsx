import { useMemo, useState } from "react";
import { FilterBuilderGroup } from "./FilterBuilder";
import { AssignToControl } from "./AssignToControl";
import { CompanyDrawer } from "./CompanyDrawer";
import { findSalesopsOwner } from "@/lib/salesops";
import { groupByGD, type GDGroup } from "@/lib/gdGrouping";
import { filterCompanies, searchCompanies } from "@/lib/filters/engine";
import type { FilterGroup } from "@/lib/filters/types";
import type { RosterOverrideMap } from "@/lib/rosterOverrides";
import type { CompanyRecord, OwnerRecord, TeamRecord } from "@/lib/types";

const EMPTY_FILTER: FilterGroup = { op: "AND", conditions: [] };

type Bucket = "gd" | "single" | null;

function distinctCountries(companies: CompanyRecord[]): string[] {
  return [...new Set(companies.map((c) => c.country).filter((v): v is string => Boolean(v)))].sort();
}

export function DataAssignmentTab({
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
  const gdPool = useMemo(() => pool.filter((c) => c.isGroupDealership === true), [pool]);
  const singlePool = useMemo(() => pool.filter((c) => c.isGroupDealership !== true), [pool]);
  const gdGroupCount = useMemo(() => groupByGD(gdPool).length, [gdPool]);

  const [bucket, setBucket] = useState<Bucket>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);

  if (!salesopsOwner) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Data Assignment</h1>
        <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900">
          Couldn't find an owner named "Salesops ." in the synced owner list. Sync first if you haven't, or check
          the exact owner name in HubSpot — matching is case-insensitive and ignores punctuation/spacing, but the
          name itself has to contain "salesops".
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Data Assignment</h1>
      <p className="mb-4 text-sm text-slate-500">Pool: companies currently owned by "{salesopsOwner.name}".</p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={() => setBucket(bucket === "gd" ? null : "gd")}
          className={`rounded-xl border p-4 text-left shadow-sm transition ${
            bucket === "gd" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md"
          }`}
        >
          <div className={`text-xs font-semibold uppercase tracking-wide ${bucket === "gd" ? "text-indigo-100" : "text-slate-500"}`}>
            Group Dealerships Available For Assignment
          </div>
          <div className={`text-2xl font-bold ${bucket === "gd" ? "text-white" : "text-slate-900"}`}>{gdGroupCount}</div>
        </button>
        <button
          onClick={() => setBucket(bucket === "single" ? null : "single")}
          className={`rounded-xl border p-4 text-left shadow-sm transition ${
            bucket === "single" ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md"
          }`}
        >
          <div className={`text-xs font-semibold uppercase tracking-wide ${bucket === "single" ? "text-indigo-100" : "text-slate-500"}`}>
            Single Companies Available For Assignment
          </div>
          <div className={`text-2xl font-bold ${bucket === "single" ? "text-white" : "text-slate-900"}`}>{singlePool.length}</div>
        </button>
      </div>

      {bucket === "gd" && (
        <GDSection pool={gdPool} owners={owners} onReassign={onReassign} onOpenCompany={setSelectedCompany} />
      )}
      {bucket === "single" && (
        <SingleSection
          pool={singlePool}
          owners={owners}
          ownerName={salesopsOwner.name ?? "Salesops ."}
          onReassign={onReassign}
          onOpenCompany={setSelectedCompany}
        />
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

function GDSection({
  pool,
  owners,
  onReassign,
  onOpenCompany,
}: {
  pool: CompanyRecord[];
  owners: OwnerRecord[];
  onReassign: (companyIds: string[], newOwnerId: string) => Promise<void>;
  onOpenCompany: (c: CompanyRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterGroup>(EMPTY_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const groups: GDGroup[] = useMemo(() => {
    const byFilter = filterCompanies(pool, filter);
    const filteredPool = search.trim()
      ? byFilter.filter((c) => c.gdName?.toLowerCase().includes(search.trim().toLowerCase()))
      : byFilter;
    return groupByGD(filteredPool);
  }, [pool, filter, search]);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  }

  const selectedCompanyIds = groups
    .filter((g) => selected.has(g.key))
    .flatMap((g) => g.companies.map((c) => c.id));

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          className="input w-64"
          placeholder="Search group name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <AssignToControl count={selected.size} owners={owners} onAssign={(ownerId) => onReassign(selectedCompanyIds, ownerId)} />
      </div>

      <div className="mb-3">
        <FilterBuilderGroup group={filter} onChange={setFilter} />
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th className="w-8" />
              <th>Group Name</th>
              <th>#Potential Rooftops</th>
              <th>Dealership Rank</th>
              <th>GD Last Activity</th>
              <th>No of Cars (GD Level)</th>
              <th>GD Stage</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key}>
                <td>
                  <input
                    type="checkbox"
                    className="accent-indigo-600"
                    checked={selected.has(g.key)}
                    onChange={() => toggle(g.key)}
                  />
                </td>
                <td className="cursor-pointer font-medium text-slate-900" onClick={() => g.companies[0] && onOpenCompany(g.companies[0])}>
                  {g.gdName ?? "—"}
                </td>
                <td>{g.potentialRooftops ?? "—"}</td>
                <td>{g.dealershipRank ?? "—"}</td>
                <td>{g.gdLastActivity ? new Date(g.gdLastActivity).toLocaleDateString() : "—"}</td>
                <td>{g.numCarsGdLevel ?? "—"}</td>
                <td>{g.gdStage ?? "—"}</td>
                <td>{g.country ?? "—"}</td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  No group dealerships match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SingleSection({
  pool,
  owners,
  ownerName,
  onReassign,
  onOpenCompany,
}: {
  pool: CompanyRecord[];
  owners: OwnerRecord[];
  ownerName: string;
  onReassign: (companyIds: string[], newOwnerId: string) => Promise<void>;
  onOpenCompany: (c: CompanyRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const countryOptions = useMemo(() => distinctCountries(pool), [pool]);

  const visible = useMemo(() => {
    let rows = searchCompanies(pool, search);
    if (country) rows = rows.filter((c) => c.country === country);
    return rows;
  }, [pool, search, country]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          className="input w-64"
          placeholder="Search company name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">All countries</option>
          {countryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <AssignToControl count={selected.size} owners={owners} onAssign={(ownerId) => onReassign([...selected], ownerId)} />
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th className="w-8" />
              <th>Company Name</th>
              <th>Company Domain Name</th>
              <th>Website Status</th>
              <th>GD Name</th>
              <th>No of Used Cars</th>
              <th>No of New Cars</th>
              <th>Total Cars</th>
              <th>Lifecycle Stage (GD Level)</th>
              <th>OEM's</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id}>
                <td>
                  <input type="checkbox" className="accent-indigo-600" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                </td>
                <td className="cursor-pointer font-medium text-slate-900" onClick={() => onOpenCompany(c)}>
                  {c.name ?? "—"}
                </td>
                <td>{c.domain ?? "—"}</td>
                <td>{c.websiteStatus ?? "—"}</td>
                <td>{c.gdName ?? "—"}</td>
                <td>{c.numUsedCars ?? "—"}</td>
                <td>{c.numNewCars ?? "—"}</td>
                <td>{c.totalCars ?? "—"}</td>
                <td>{c.lifecycleStageGdLevel ?? "—"}</td>
                <td>{c.oem ?? "—"}</td>
                <td>{c.country ?? "—"}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                  No companies match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">Owner column omitted here — every row's owner is "{ownerName}" until reassigned.</p>
    </div>
  );
}
