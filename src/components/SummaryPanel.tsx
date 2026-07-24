import { useMemo, useState } from "react";
import { BAND_LABELS, BAND_ORDER } from "@/lib/scoring/types";
import type { OwnerRecord, ScoredCompany, TeamRecord } from "@/lib/types";

const TOP_N = 8;

function countBy<T>(items: T[], keyFn: (item: T) => string | null | undefined): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) ?? "(blank)";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function BreakdownList({ title, counts, total }: { title: string; counts: Map<string, number>; total: number }) {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const shown = sorted.slice(0, TOP_N);
  const remainder = sorted.length - shown.length;

  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <div className="space-y-1">
        {shown.map(([label, count]) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span className="w-32 truncate" title={label}>
              {label}
            </span>
            <div className="h-2 flex-1 rounded bg-gray-100">
              <div
                className="h-2 rounded bg-blue-400"
                style={{ width: `${total ? Math.round((count / total) * 100) : 0}%` }}
              />
            </div>
            <span className="w-10 text-right text-gray-600">{count}</span>
          </div>
        ))}
        {remainder > 0 && <div className="text-xs text-gray-400">+{remainder} more not shown</div>}
        {shown.length === 0 && <div className="text-xs text-gray-400">No data</div>}
      </div>
    </div>
  );
}

export function SummaryPanel({
  totalScanned,
  filtered,
  owners,
  teams,
}: {
  totalScanned: number;
  filtered: ScoredCompany[];
  owners: Map<string, OwnerRecord>;
  teams: Map<string, TeamRecord>;
}) {
  const [expanded, setExpanded] = useState(true);

  const bandCounts = useMemo(() => countBy(filtered, (c) => c.scoreBand), [filtered]);
  const ownerCounts = useMemo(
    () => countBy(filtered, (c) => (c.ownerId ? owners.get(c.ownerId)?.name ?? c.ownerId : null)),
    [filtered, owners],
  );
  const teamCounts = useMemo(
    () => countBy(filtered, (c) => (c.teamId ? teams.get(c.teamId)?.name ?? c.teamId : null)),
    [filtered, teams],
  );
  const lifecycleCounts = useMemo(() => countBy(filtered, (c) => c.lifecycleStageGdLevel), [filtered]);
  const websiteStatusCounts = useMemo(() => countBy(filtered, (c) => c.websiteStatus), [filtered]);
  const geoCounts = useMemo(() => countBy(filtered, (c) => c.country), [filtered]);

  return (
    <div className="mb-4 rounded-lg border bg-white p-4">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-left">
        <div className="flex gap-6 text-sm">
          <span>
            <strong>{totalScanned.toLocaleString()}</strong> scanned
          </span>
          <span>
            <strong>{filtered.length.toLocaleString()}</strong> match current filters
          </span>
          {BAND_ORDER.map((band) => (
            <span key={band} className="text-gray-600">
              <strong>{bandCounts.get(band) ?? 0}</strong> {BAND_LABELS[band]}
            </span>
          ))}
        </div>
        <span className="text-sm text-gray-400">{expanded ? "Hide breakdowns ▲" : "Show breakdowns ▼"}</span>
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 gap-6 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <BreakdownList title="By score band" counts={renameBandKeys(bandCounts)} total={filtered.length} />
          <BreakdownList title="By owner" counts={ownerCounts} total={filtered.length} />
          <BreakdownList title="By team" counts={teamCounts} total={filtered.length} />
          <BreakdownList title="By lifecycle stage (GD level)" counts={lifecycleCounts} total={filtered.length} />
          <BreakdownList title="By website status" counts={websiteStatusCounts} total={filtered.length} />
          <BreakdownList title="By country" counts={geoCounts} total={filtered.length} />
        </div>
      )}
    </div>
  );
}

function renameBandKeys(counts: Map<string, number>): Map<string, number> {
  const renamed = new Map<string, number>();
  for (const [key, value] of counts.entries()) {
    const label = BAND_LABELS[key as keyof typeof BAND_LABELS] ?? key;
    renamed.set(label, value);
  }
  return renamed;
}
