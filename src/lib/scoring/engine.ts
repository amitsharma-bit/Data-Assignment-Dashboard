import { evaluateCondition } from "@/lib/filters/engine";
import type { CompanyRecord, Disqualifier, ScoreBand, ScoreReason, ScoredCompany } from "@/lib/types";
import { BAND_ORDER, type ScoringConfig } from "./types";

export interface ScoreResult {
  score: number;
  band: ScoreBand;
  reasons: ScoreReason[];
  disqualifiers: Disqualifier[];
}

function bandFor(score: number, config: ScoringConfig): ScoreBand {
  for (const band of BAND_ORDER) {
    const range = config.bandThresholds[band];
    if (score >= range.min && score <= range.max) return band;
  }
  return "poor_candidate";
}

export function scoreCompany(company: CompanyRecord, config: ScoringConfig): ScoreResult {
  const disqualifiers: Disqualifier[] = config.hardDisqualifiers
    .filter((rule) => evaluateCondition(company, rule.condition))
    .map((rule) => ({ name: rule.name, reason: rule.reason }));

  let points = config.basePoints;
  const reasons: ScoreReason[] = [];
  for (const signal of config.weightedSignals) {
    if (evaluateCondition(company, signal.condition)) {
      points += signal.points;
      reasons.push({ signal: signal.name, points: signal.points, description: signal.description });
    }
  }

  points = Math.max(0, Math.min(100, points));

  if (disqualifiers.length > 0) {
    points = Math.min(points, config.bandThresholds.poor_candidate.max);
  }

  return { score: points, band: bandFor(points, config), reasons, disqualifiers };
}

export function scoreCompanies(companies: CompanyRecord[], config: ScoringConfig): ScoredCompany[] {
  return companies.map((company) => {
    const result = scoreCompany(company, config);
    return {
      ...company,
      score: result.score,
      scoreBand: result.band,
      scoreReasons: result.reasons,
      disqualifiers: result.disqualifiers,
    };
  });
}

/** Rule-based, deterministic — no LLM call, matches the plan's explainability contract. */
export function recommendedAction(company: ScoredCompany): string {
  if (company.disqualifiers.length > 0) {
    return `Not recommended — blocked by: ${company.disqualifiers.map((d) => d.reason).join("; ")}.`;
  }
  switch (company.scoreBand) {
    case "highly_assignable":
      return "Strong candidate — safe to prioritize for reassignment.";
    case "good_candidate":
      return "Good candidate — worth reassigning, do a quick sanity check first.";
    case "needs_review":
      return "Needs review — borderline or missing signals, inspect before deciding.";
    default:
      return "Poor candidate — inventory, contact, or website signals are too weak right now.";
  }
}
