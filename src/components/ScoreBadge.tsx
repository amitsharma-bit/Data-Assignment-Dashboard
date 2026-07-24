import { BAND_LABELS } from "@/lib/scoring/types";
import type { ScoreBand } from "@/lib/types";

const BAND_STYLES: Record<ScoreBand, string> = {
  highly_assignable: "bg-emerald-100 text-emerald-800 border-emerald-300",
  good_candidate: "bg-blue-100 text-blue-800 border-blue-300",
  needs_review: "bg-amber-100 text-amber-800 border-amber-300",
  poor_candidate: "bg-gray-100 text-gray-700 border-gray-300",
};

export function ScoreBadge({ score, band }: { score: number; band: ScoreBand }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${BAND_STYLES[band]}`}>
      {score} · {BAND_LABELS[band]}
    </span>
  );
}
