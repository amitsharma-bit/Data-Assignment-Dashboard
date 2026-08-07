import { useCallback, useEffect, useMemo, useState } from "react";
import { clearAllData, getAllCompanies, getAllOwners, getAllTeams, getMeta } from "@/lib/db";
import { runSync, type SyncProgress } from "@/lib/hubspot/sync";
import { reassignCompanies as reassignCompaniesInHubspot } from "@/lib/hubspot/mutate";
import { friendlyErrorMessage } from "@/lib/hubspot/proxyClient";
import {
  loadRosterOverrides,
  removeRosterOverride as removeRosterOverrideInDb,
  saveRosterOverride as saveRosterOverrideInDb,
  type RosterOverride,
  type RosterOverrideMap,
} from "@/lib/rosterOverrides";
import type { CompanyRecord, OwnerRecord, TeamRecord } from "@/lib/types";

export function useAppData() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [owners, setOwners] = useState<OwnerRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [rosterOverrides, setRosterOverrides] = useState<RosterOverrideMap>({});

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const loadFromLocalCache = useCallback(async () => {
    const [c, o, t, ts, overrides] = await Promise.all([
      getAllCompanies(),
      getAllOwners(),
      getAllTeams(),
      getMeta<string>("lastSyncedAt"),
      loadRosterOverrides(),
    ]);
    setCompanies(c);
    setOwners(o);
    setTeams(t);
    setLastSyncedAt(ts ?? null);
    setRosterOverrides(overrides);
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
        setSyncError(friendlyErrorMessage(err, "Couldn't sync with HubSpot. Please try again in a moment."));
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

  const reassignCompanies = useCallback(
    async (companyIds: string[], newOwnerId: string) => {
      if (companyIds.length === 0) return;
      setReassigning(true);
      setReassignError(null);
      try {
        await reassignCompaniesInHubspot(companyIds, newOwnerId);
        await loadFromLocalCache();
      } catch (err) {
        setReassignError(friendlyErrorMessage(err, "Couldn't update HubSpot. Please try again in a moment."));
        throw err;
      } finally {
        setReassigning(false);
      }
    },
    [loadFromLocalCache],
  );

  const saveRosterOverride = useCallback(async (override: RosterOverride) => {
    const next = await saveRosterOverrideInDb(override);
    setRosterOverrides(next);
  }, []);

  const removeRosterOverride = useCallback(async (ownerId: string) => {
    const next = await removeRosterOverrideInDb(ownerId);
    setRosterOverrides(next);
  }, []);

  const ownerMap = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  return {
    loaded,
    companies,
    owners,
    teams,
    ownerMap,
    teamMap,
    lastSyncedAt,
    syncing,
    syncProgress,
    syncError,
    handleSync,
    handleResetLocalData,
    reassigning,
    reassignError,
    reassignCompanies,
    rosterOverrides,
    saveRosterOverride,
    removeRosterOverride,
  };
}

export type AppData = ReturnType<typeof useAppData>;
