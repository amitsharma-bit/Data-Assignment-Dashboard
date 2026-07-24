import { getMeta, setMeta } from "@/lib/db";
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "./types";

const META_KEY = "scoringConfig";

export async function loadScoringConfig(): Promise<ScoringConfig> {
  const stored = await getMeta<ScoringConfig>(META_KEY);
  return stored ?? DEFAULT_SCORING_CONFIG;
}

export async function saveScoringConfig(config: ScoringConfig): Promise<void> {
  await setMeta(META_KEY, config);
}

export async function resetScoringConfig(): Promise<ScoringConfig> {
  await setMeta(META_KEY, DEFAULT_SCORING_CONFIG);
  return DEFAULT_SCORING_CONFIG;
}
