import { useState } from "react";
import { OverviewTab } from "./components/OverviewTab";
import { DataAssignmentTab } from "./components/DataAssignmentTab";
import { SmartPlannerTab } from "./components/SmartPlannerTab";
import { useAppData } from "./hooks/useAppData";
import { getAccessKey, setAccessKey } from "@/lib/hubspot/proxyClient";

type Tab = "overview" | "assignment" | "planner";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "assignment", label: "Data Assignment" },
  { key: "planner", label: "Smart Assignment Planner" },
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
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold">Data Assignment Dashboard</h1>
            <p className="text-xs text-gray-500">
              {data.lastSyncedAt ? `Last synced ${new Date(data.lastSyncedAt).toLocaleString()}` : "Not synced yet"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => data.handleSync(data.companies.length === 0 ? "full" : "incremental")}
              disabled={data.syncing}
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
            >
              {data.syncing
                ? data.syncProgress
                  ? `Syncing ${data.syncProgress.phase}... (${data.syncProgress.processed})`
                  : "Starting sync..."
                : data.companies.length === 0
                  ? "Run first sync"
                  : "Sync now"}
            </button>
            <button onClick={() => data.handleSync("full")} disabled={data.syncing} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50">
              Full resync
            </button>
            <button onClick={() => setShowSettings((v) => !v)} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100">
              Settings
            </button>
          </div>
        </div>

        {(data.syncError || data.reassignError) && (
          <div className="mx-auto max-w-7xl px-6 pb-2 text-sm text-red-600">{data.syncError || data.reassignError}</div>
        )}

        {showSettings && (
          <div className="mx-auto max-w-7xl px-6 pb-4">
            <div className="rounded-lg border bg-gray-50 p-4">
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
          </div>
        )}

        <nav className="mx-auto flex max-w-7xl gap-1 px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium ${
                tab === t.key ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {!data.loaded ? (
        <div className="p-8 text-sm text-gray-500">Loading local cache...</div>
      ) : data.companies.length === 0 ? (
        <div className="mx-auto max-w-7xl p-6">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            No data cached in this browser yet. Click <strong>Run first sync</strong> above — for a 100k+ record
            portal this can take a few minutes and only needs to be done once.
          </div>
        </div>
      ) : (
        <>
          {tab === "overview" && (
            <OverviewTab companies={data.companies} owners={data.owners} teams={data.teams} ownerMap={data.ownerMap} teamMap={data.teamMap} />
          )}
          {tab === "assignment" && (
            <DataAssignmentTab
              companies={data.companies}
              owners={data.owners}
              ownerMap={data.ownerMap}
              teamMap={data.teamMap}
              onReassign={data.reassignCompanies}
            />
          )}
          {tab === "planner" && (
            <SmartPlannerTab
              companies={data.companies}
              owners={data.owners}
              ownerMap={data.ownerMap}
              teamMap={data.teamMap}
              onReassign={data.reassignCompanies}
            />
          )}
        </>
      )}
    </div>
  );
}
