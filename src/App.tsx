import { useState } from "react";
import { OverviewTab } from "./components/OverviewTab";
import { DataAssignmentTab } from "./components/DataAssignmentTab";
import { SmartPlannerTab } from "./components/SmartPlannerTab";
import { AdminControlCenter } from "./components/AdminControlCenter";
import { useAppData } from "./hooks/useAppData";
import { getAccessKey, setAccessKey } from "@/lib/hubspot/proxyClient";

type Tab = "overview" | "assignment" | "planner" | "admin";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "assignment", label: "Data Assignment" },
  { key: "planner", label: "Smart Assignment Planner" },
  { key: "admin", label: "Admin · Control Center" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [showSettings, setShowSettings] = useState(false);
  const [accessKeyInput, setAccessKeyInput] = useState(getAccessKey());
  const data = useAppData();

  async function handleResetLocalDataConfirmed() {
    if (!confirm("This clears everything cached in this browser. You'll need to sync again. Continue?")) return;
    await data.handleResetLocalData();
  }

  return (
    <div>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm">
              DA
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-slate-900">Data Assignment Dashboard</h1>
              <p className="text-xs text-slate-500">
                {data.lastSyncedAt ? `Last synced ${new Date(data.lastSyncedAt).toLocaleString()}` : "Not synced yet"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => data.handleSync(data.companies.length === 0 ? "full" : "incremental")}
              disabled={data.syncing}
              className="btn-primary"
            >
              {data.syncing
                ? data.syncProgress
                  ? `Syncing ${data.syncProgress.phase}... (${data.syncProgress.processed})`
                  : "Starting sync..."
                : data.companies.length === 0
                  ? "Run first sync"
                  : "Sync now"}
            </button>
            <button onClick={() => data.handleSync("full")} disabled={data.syncing} className="btn-secondary">
              Full resync
            </button>
            <button onClick={() => setShowSettings((v) => !v)} className="btn-secondary">
              Settings
            </button>
          </div>
        </div>

        {(data.syncError || data.reassignError) && (
          <div className="mx-auto max-w-7xl px-6 pb-2 text-sm text-red-600">{data.syncError || data.reassignError}</div>
        )}

        {showSettings && (
          <div className="mx-auto max-w-7xl px-6 pb-4">
            <div className="card bg-slate-50">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Settings</h2>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Dashboard access key (only needed if DASHBOARD_ACCESS_KEY is set on the server)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={accessKeyInput}
                  onChange={(e) => setAccessKeyInput(e.target.value)}
                  className="input w-64"
                />
                <button onClick={() => setAccessKey(accessKeyInput)} className="btn-primary">
                  Save
                </button>
              </div>
              <button onClick={handleResetLocalDataConfirmed} className="btn-danger-ghost mt-3 !px-0">
                Reset local data (clears this browser's cache)
              </button>
            </div>
          </div>
        )}

        <nav className="mx-auto flex max-w-7xl gap-1 px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium transition ${
                tab === t.key
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {!data.loaded ? (
        <div className="p-8 text-sm text-slate-500">Loading local cache...</div>
      ) : data.companies.length === 0 ? (
        <div className="mx-auto max-w-7xl p-6">
          <div className="card border-amber-200 bg-amber-50 text-sm text-amber-900">
            No data cached in this browser yet. Click <strong>Run first sync</strong> above — for a 100k+ record
            portal this can take a few minutes and only needs to be done once.
          </div>
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <OverviewTab
              companies={data.companies}
              ownerMap={data.ownerMap}
              teamMap={data.teamMap}
              rosterOverrides={data.rosterOverrides}
            />
          )}
          {tab === "assignment" && (
            <DataAssignmentTab
              companies={data.companies}
              owners={data.owners}
              ownerMap={data.ownerMap}
              teamMap={data.teamMap}
              rosterOverrides={data.rosterOverrides}
              onReassign={data.reassignCompanies}
            />
          )}
          {tab === "planner" && (
            <SmartPlannerTab
              companies={data.companies}
              owners={data.owners}
              ownerMap={data.ownerMap}
              teamMap={data.teamMap}
              rosterOverrides={data.rosterOverrides}
              onReassign={data.reassignCompanies}
            />
          )}
          {tab === "admin" && (
            <AdminControlCenter
              owners={data.owners}
              rosterOverrides={data.rosterOverrides}
              onSave={data.saveRosterOverride}
              onRemove={data.removeRosterOverride}
            />
          )}
        </>
      )}
    </div>
  );
}
