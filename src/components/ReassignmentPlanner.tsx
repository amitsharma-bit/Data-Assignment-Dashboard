import { useMemo, useState } from "react";
import type { OwnerRecord, ScoredCompany } from "@/lib/types";
import { BAND_LABELS } from "@/lib/scoring/types";
import { recommendedAction } from "@/lib/scoring/engine";
import { ScoreBadge } from "./ScoreBadge";

type Confidence = "high" | "medium" | "low";

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  high: "border-emerald-300 bg-emerald-50",
  medium: "border-blue-300 bg-blue-50",
  low: "border-gray-300 bg-gray-50",
};

function bucketOf(company: ScoredCompany): Confidence {
  if (company.disqualifiers.length > 0) return "low";
  if (company.scoreBand === "highly_assignable") return "high";
  if (company.scoreBand === "good_candidate") return "medium";
  return "low";
}

function toCsv(rows: ScoredCompany[]): string {
  function esc(v: string) {
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }
  const header = ["Company name", "Score", "Band", "Confidence bucket", "Reasons", "Disqualifiers"];
  const lines = rows.map((c) =>
    [
      c.name ?? "",
      String(c.score),
      BAND_LABELS[c.scoreBand],
      CONFIDENCE_LABELS[bucketOf(c)],
      c.scoreReasons.map((r) => r.description).join("; "),
      c.disqualifiers.map((d) => d.reason).join("; "),
    ]
      .map((v) => esc(v))
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(rows: ScoredCompany[], filename: string) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReassignmentPlanner({
  companies,
  owners,
}: {
  companies: ScoredCompany[];
  owners: OwnerRecord[];
}) {
  const [fromOwnerId, setFromOwnerId] = useState<string>("");
  const [toOwnerId, setToOwnerId] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<Confidence>>(new Set(["high"]));

  const sortedOwners = useMemo(
    () => [...owners].filter((o) => o.name).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [owners],
  );

  const ownedByFrom = useMemo(
    () => (fromOwnerId ? companies.filter((c) => c.ownerId === fromOwnerId) : []),
    [companies, fromOwnerId],
  );

  const buckets = useMemo(() => {
    const result: Record<Confidence, ScoredCompany[]> = { high: [], medium: [], low: [] };
    for (const c of ownedByFrom) result[bucketOf(c)].push(c);
    for (const key of Object.keys(result) as Confidence[]) {
      result[key].sort((a, b) => b.score - a.score);
    }
    return result;
  }, [ownedByFrom]);

  function toggleExpanded(bucket: Confidence) {
    const next = new Set(expanded);
    if (next.has(bucket)) next.delete(bucket);
    else next.add(bucket);
    setExpanded(next);
  }

  const fromOwnerName = sortedOwners.find((o) => o.id === fromOwnerId)?.name ?? fromOwnerId;
  const toOwnerName = sortedOwners.find((o) => o.id === toOwnerId)?.name ?? toOwnerId;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Reassignment Planner</h1>
      <p className="mb-4 text-sm text-gray-500">
        Pick a source owner to see their portfolio bucketed by transfer confidence, using the same
        assignability scoring as the main dashboard.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">From owner</label>
          <select
            className="w-56 rounded border px-2 py-1.5 text-sm"
            value={fromOwnerId}
            onChange={(e) => setFromOwnerId(e.target.value)}
          >
            <option value="">Select owner...</option>
            {sortedOwners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">To owner (label only)</label>
          <select
            className="w-56 rounded border px-2 py-1.5 text-sm"
            value={toOwnerId}
            onChange={(e) => setToOwnerId(e.target.value)}
          >
            <option value="">Select owner...</option>
            {sortedOwners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        {fromOwnerId && (
          <button
            onClick={() => downloadCsv(ownedByFrom, `reassignment-${fromOwnerName}-to-${toOwnerName || "unassigned"}.csv`)}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            Export full plan CSV
          </button>
        )}
      </div>

      {!fromOwnerId && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
          Select a source owner to see their eligible accounts.
        </div>
      )}

      {fromOwnerId && ownedByFrom.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-500">
          {fromOwnerName} has no companies in the local cache. Try syncing if this owner should have some.
        </div>
      )}

      {fromOwnerId && ownedByFrom.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            {ownedByFrom.length} companies owned by <strong>{fromOwnerName}</strong>
            {toOwnerName ? (
              <>
                {" "}
                — planning transfer to <strong>{toOwnerName}</strong>
              </>
            ) : null}
          </div>

          {(["high", "medium", "low"] as Confidence[]).map((bucket) => (
            <div key={bucket} className={`rounded-lg border p-3 ${CONFIDENCE_STYLES[bucket]}`}>
              <button
                onClick={() => toggleExpanded(bucket)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-semibold">
                  {CONFIDENCE_LABELS[bucket]} — {buckets[bucket].length} companies
                </span>
                <span className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadCsv(buckets[bucket], `reassignment-${bucket}-confidence.csv`);
                    }}
                    className="rounded border bg-white px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Export
                  </button>
                  <span className="text-xs text-gray-500">{expanded.has(bucket) ? "▲" : "▼"}</span>
                </span>
              </button>

              {expanded.has(bucket) && (
                <div className="mt-3 space-y-2">
                  {buckets[bucket].length === 0 && <div className="text-sm text-gray-400">None</div>}
                  {buckets[bucket].map((c) => (
                    <div key={c.id} className="rounded border bg-white p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{c.name}</span>
                        <ScoreBadge score={c.score} band={c.scoreBand} />
                      </div>
                      <div className="mt-1 text-xs text-gray-600">{recommendedAction(c)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
