import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { ReassignmentPlanner } from "./components/ReassignmentPlanner";
import { AdminRules } from "./components/AdminRules";
import { useAppData } from "./hooks/useAppData";

type Tab = "dashboard" | "reassignment" | "admin";

const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "reassignment", label: "Reassignment Planner" },
  { key: "admin", label: "Scoring Rules" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const data = useAppData();

  return (
    <div>
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 px-6">
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
        </div>
      </nav>

      {!data.loaded ? (
        <div className="p-8 text-sm text-gray-500">Loading local cache...</div>
      ) : (
        <>
          {tab === "dashboard" && <Dashboard data={data} />}
          {tab === "reassignment" && <ReassignmentPlanner companies={data.scoredCompanies} owners={data.owners} />}
          {tab === "admin" && data.scoringConfig && <AdminRules config={data.scoringConfig} onSave={data.updateScoringConfig} />}
        </>
      )}
    </div>
  );
}
