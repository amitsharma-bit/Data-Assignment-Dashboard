import { useEffect, useMemo, useState } from "react";
import { FilterBuilderGroup } from "./FilterBuilder";
import { CompanyDrawer } from "./CompanyDrawer";
import { SummaryPanel } from "./SummaryPanel";
import { ScoreBadge } from "./ScoreBadge";
import { PRESETS } from "@/presets";
import type { FilterGroup } from "@/lib/filters/types";
import type { OwnerRecord, SavedFilterRecord, ScoredCompany, TeamRecord } from "@/lib/types";
import { filterCompanies, searchCompanies, sortCompanies } from "@/lib/filters/engine";
import { deleteSavedFilter, getAllSavedFilters, putSavedFilter } from "@/lib/db";
import { getAccessKey, setAccessKey } from "@/lib/hubspot/proxyClient";
import type { AppData } from "@/hooks/useAppData";

const EMPTY_FILTER: FilterGroup = { op: "AND", conditions: [] };
const PAGE_SIZE = 50;

const COLUMNS: {
  key: string;
  label: string;
  sortField?: string;
  render: (c: ScoredCompany, ctx: { owners: Map<string, OwnerRecord>; teams: Map<string, TeamRecord> }) => React.ReactNode;
}[] = [
  {
    key: "score",
    label: "Score",
    sortField: "score",
    render: (c) => <ScoreBadge score={c.score} band={c.scoreBand} />,
  },
  { key: "name", label: "Company", sortField: "name", render: (c) => c.name ?? "—" },
  { key: "owner", label: "Owner", render: (c, ctx) => ctx.owners.get(c.ownerId ?? "")?.name ?? c.ownerId ?? "—" },
  { key: "team", label: "Team", render: (c, ctx) => ctx.teams.get(c.teamId ?? "")?.name ?? c.teamId ?? "—" },
  { key: "websiteStatus", label: "Website status", sortField: "website_status", render: (c) => c.websiteStatus ?? "—" },
  { key: "gdName", label: "GD name", sortField: "gd_name", render: (c) => c.gdName ?? "—" },
  { key: "lifecycleStageGdLevel", label: "Lifecycle (GD)", sortField: "lifecycle_stage_gd_level", render: (c) => c.lifecycleStageGdLevel ?? "—" },
  { key: "oem", label: "OEM", sortField: "oem_s", render: (c) => c.oem ?? "—" },
  { key: "dmsName", label: "DMS", sortField: "dms_name", render: (c) => c.dmsName ?? "—" },
  { key: "numAssociatedContacts", label: "Contacts", sortField: "num_associated_contacts", render: (c) => c.numAssociatedContacts ?? "—" },
  { key: "numAssociatedDeals", label: "Deals", sortField: "num_associated_deals", render: (c) => c.numAssociatedDeals ?? "—" },
  { key: "numUsedCars", label: "Used cars", sortField: "number_of_used_cars", render: (c) => c.numUsedCars ?? "—" },
  { key: "totalCars", label: "Total cars", sortField: "total_cars", render: (c) => c.totalCars ?? "—" },
  { key: "country", label: "Country", sortField: "country", render: (c) => c.country ?? "—" },
  {
    key: "lastActivityDate",
    label: "Last activity",
    sortField: "notes_last_contacted",
    render: (c) => (c.lastActivityDate ? new Date(c.lastActivityDate).toLocaleDateString() : "—"),
  },
];

function toCsv(rows: ScoredCompany[], owners: Map<string, OwnerRecord>, teams: Map<string, TeamRecord>): string {
  function esc(v: string) {
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }
  const header = COLUMNS.map((c) => esc(c.label)).join(",");
  const lines = rows.map((row) =>
    COLUMNS.map((c) => {
      const rendered = c.render(row, { owners, teams });
      const text = typeof rendered === "string" || typeof rendered === "number" ? String(rendered) : `${row.score}`;
      return esc(text);
    }).join(","),
  );
  return [header, ...lines].join("\n");
}

export function Dashboard({ data }: { data: AppData }) {
  const { scoredCompanies, companies, owners, teams, ownerMap, teamMap, lastSyncedAt, syncing, syncProgress, syncError, handleSync, handleResetLocalData } = data;

  const [filter, setFilter] = useState<FilterGroup>(EMPTY_FILTER);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string | undefined>("score");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(COLUMNS.map((c) => c.key)));
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [accessKeyInput, setAccessKeyInput] = useState(getAccessKey());
  const [selectedCompany, setSelectedCompany] = useState<ScoredCompany | null>(null);

  const [savedFilters, setSavedFilters] = useState<SavedFilterRecord[]>([]);

  useEffect(() => {
    getAllSavedFilters().then(setSavedFilters);
  }, []);

  const filtered = useMemo(() => {
    const byFilter = filterCompanies(scoredCompanies, filter);
    const bySearch = searchCompanies(byFilter, search);
    return sortCompanies(bySearch, sortField, sortDirection);
  }, [scoredCompanies, filter, search, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(field?: string) {
    if (!field) return;
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  function exportCsv() {
    const csv = toCsv(filtered, ownerMap, teamMap);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "companies-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveCurrentFilter() {
    const name = prompt("Name this filter preset:");
    if (!name) return;
    const record: SavedFilterRecord = {
      id: crypto.randomUUID(),
      name,
      filter,
      createdAt: new Date().toISOString(),
    };
    await putSavedFilter(record);
    setSavedFilters((prev) => [...prev, record]);
  }

  async function handleDeleteSavedFilter(id: string) {
    await deleteSavedFilter(id);
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleResetLocalDataConfirmed() {
    if (!confirm("This clears everything cached in this browser. You'll need to sync again. Continue?")) return;
    await handleResetLocalData();
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Data Assignment Dashboard</h1>
          <p className="text-xs text-gray-500">
            {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : "Not synced yet"}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleSync(companies.length === 0 ? "full" : "incremental")}
            disabled={syncing}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            {syncing
              ? syncProgress
                ? `Syncing ${syncProgress.phase}... (${syncProgress.processed})`
                : "Starting sync..."
              : companies.length === 0
                ? "Run first sync"
                : "Sync now"}
          </button>
          <button onClick={() => handleSync("full")} disabled={syncing} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50">
            Full resync
          </button>
          <button onClick={() => setShowSettings((v) => !v)} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100">
            Settings
          </button>
        </div>
      </div>

      {syncError && <p className="mb-3 text-sm text-red-600">{syncError}</p>}

      {showSettings && (
        <div className="mb-4 rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Settings</h2>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Dashboard access key (only needed if DASHBOARD_ACCESS_KEY is set on the server)
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={accessKeyInput}
              onChange={(e) => setAccessKeyInput(e.target.value)}
              className="w-64 rounded border px-2 py-1.5 text-sm"
            />
            <button onClick={() => setAccessKey(accessKeyInput)} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white">
              Save
            </button>
          </div>
          <button onClick={handleResetLocalDataConfirmed} className="mt-3 text-sm text-red-600 hover:underline">
            Reset local data (clears this browser's cache)
          </button>
        </div>
      )}

      {companies.length === 0 && !syncing && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          No data cached in this browser yet. Click <strong>Run first sync</strong> above — for a 100k+ record
          portal this can take a few minutes and only needs to be done once.
        </div>
      )}

      <SummaryPanel totalScanned={companies.length} filtered={filtered} owners={ownerMap} teams={teamMap} />

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            title={preset.description}
            onClick={() => setFilter(preset.filter)}
            className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-sm text-blue-800 hover:bg-blue-100"
          >
            {preset.name}
          </button>
        ))}
        {savedFilters.map((preset) => (
          <span key={preset.id} className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-sm text-purple-800">
            <button onClick={() => setFilter(preset.filter)} className="hover:underline">
              {preset.name}
            </button>
            <button onClick={() => handleDeleteSavedFilter(preset.id)} className="text-purple-400 hover:text-red-600">
              ×
            </button>
          </span>
        ))}
        <button onClick={() => setFilter(EMPTY_FILTER)} className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100">
          Clear filters
        </button>
        <button onClick={handleSaveCurrentFilter} className="rounded-full border border-dashed border-gray-400 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100">
          + Save current filter
        </button>
      </div>

      <div className="mb-4 rounded-lg border bg-white p-4">
        <FilterBuilderGroup group={filter} onChange={setFilter} />
        <div className="mt-3 flex items-center gap-3">
          <input
            className="w-64 rounded border px-2 py-1.5 text-sm"
            placeholder="Search company name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button onClick={exportCsv} className="rounded border px-4 py-1.5 text-sm font-medium hover:bg-gray-100">
            Export CSV ({filtered.length.toLocaleString()})
          </button>
          <div className="relative ml-auto">
            <button onClick={() => setShowColumnMenu((v) => !v)} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100">
              Columns
            </button>
            {showColumnMenu && (
              <div className="absolute right-0 z-10 mt-1 w-56 rounded border bg-white p-2 shadow-lg">
                {COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-0.5 text-sm">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.key)}
                      onChange={(e) => {
                        const next = new Set(visibleColumns);
                        if (e.target.checked) next.add(col.key);
                        else next.delete(col.key);
                        setVisibleColumns(next);
                      }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              {COLUMNS.filter((c) => visibleColumns.has(c.key)).map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.sortField)}
                  className={`px-3 py-2 text-left font-medium text-gray-700 ${col.sortField ? "cursor-pointer hover:underline" : ""}`}
                >
                  {col.label}
                  {sortField === col.sortField && (sortDirection === "asc" ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((company) => (
              <tr key={company.id} className="cursor-pointer border-b hover:bg-gray-50" onClick={() => setSelectedCompany(company)}>
                {COLUMNS.filter((c) => visibleColumns.has(c.key)).map((col) => (
                  <td key={col.key} className="px-3 py-2">
                    {col.render(company, { owners: ownerMap, teams: teamMap })}
                  </td>
                ))}
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-gray-500">
                  No companies match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border px-3 py-1 disabled:opacity-40">
            Previous
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded border px-3 py-1 disabled:opacity-40">
            Next
          </button>
        </div>
      </div>

      <CompanyDrawer company={selectedCompany} owners={ownerMap} teams={teamMap} onClose={() => setSelectedCompany(null)} />
    </div>
  );
}
