import { useCallback, useEffect, useMemo, useState } from "react";
import { clearAllData, getAllCompanies, getAllOwners, getAllTeams, getMeta } from "@/lib/db";
import { runSync, type SyncProgress } from "@/lib/hubspot/sync";
import { loadScoringConfig, saveScoringConfig } from "@/lib/scoring/storage";
import { scoreCompanies } from "@/lib/scoring/engine";
import type { ScoringConfig } from "@/lib/scoring/types";
import type { CompanyRecord, OwnerRecord, ScoredCompany, TeamRecord } from "@/lib/types";

export function useAppData() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [owners, setOwners] = useState<OwnerRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadFromLocalCache = useCallback(async () => {
    const [c, o, t, ts, config] = await Promise.all([
      getAllCompanies(),
      getAllOwners(),
      getAllTeams(),
      getMeta<string>("lastSyncedAt"),
      loadScoringConfig(),
    ]);
    setCompanies(c);
    setOwners(o);
    setTeams(t);
    setLastSyncedAt(ts ?? null);
    setScoringConfig(config);
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadFromLocalCache();
  }, [loadFromLocalCache]);

  const handleSync = useCallback(
    async (type: "full" | "incremental") => {
      setSyncing(true);
      setSyncError(null);
      setSyncProgress(null);
      try {
        await runSync(type, setSyncProgress);
        await loadFromLocalCache();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : "Sync failed");
      } finally {
        setSyncing(false);
      }
    },
    [loadFromLocalCache],
  );

  const handleResetLocalData = useCallback(async () => {
    await clearAllData();
    await loadFromLocalCache();
  }, [loadFromLocalCache]);

  const updateScoringConfig = useCallback(async (config: ScoringConfig) => {
    await saveScoringConfig(config);
    setScoringConfig(config);
  }, []);

  const ownerMap = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const scoredCompanies: ScoredCompany[] = useMemo(() => {
    if (!scoringConfig) return [];
    return scoreCompanies(companies, scoringConfig);
  }, [companies, scoringConfig]);

  return {
    loaded,
    companies,
    scoredCompanies,
    owners,
    teams,
    ownerMap,
    teamMap,
    lastSyncedAt,
    scoringConfig,
    updateScoringConfig,
    syncing,
    syncProgress,
    syncError,
    handleSync,
    handleResetLocalData,
  };
}

export type AppData = ReturnType<typeof useAppData>;
