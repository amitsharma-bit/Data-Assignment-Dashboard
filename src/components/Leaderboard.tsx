import { useMemo } from "react";
import type { CompanyRecord, TeamRecord } from "@/lib/types";
import { groupByGD } from "@/lib/gdGrouping";

interface TeamStats {
  team: TeamRecord;
  gdCount: number;
  singleCount: number;
  totalCompanies: number;
}

function statsForTeam(team: TeamRecord, companies: CompanyRecord[]): TeamStats {
  const teamCompanies = companies.filter((c) => c.teamId === team.id);
  const gdGroups = groupByGD(teamCompanies);
  const singleCompanies = teamCompanies.filter((c) => c.isGroupDealership !== true);

  const rooftopTotal = gdGroups.reduce((sum, g) => sum + (g.potentialRooftops ?? g.companies.length), 0);

  return {
    team,
    gdCount: gdGroups.length,
    singleCount: singleCompanies.length,
    totalCompanies: rooftopTotal + singleCompanies.length,
  };
}

export function Leaderboard({
  teams,
  companies,
  selectedTeamId,
  onSelectTeam,
}: {
  teams: TeamRecord[];
  companies: CompanyRecord[];
  selectedTeamId: string | null;
  onSelectTeam: (teamId: string | null) => void;
}) {
  const stats = useMemo(() => teams.map((t) => statsForTeam(t, companies)), [teams, companies]);

  if (teams.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
        None of the four sales teams (Neelima, Archit, Prince, Saarthak) were found yet — sync first, or check
        team names in HubSpot match.
      </div>
    );
  }

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ team, gdCount, singleCount, totalCompanies }) => {
        const selected = selectedTeamId === team.id;
        return (
          <button
            key={team.id}
            onClick={() => onSelectTeam(selected ? null : team.id)}
            className={`rounded-lg border p-4 text-left transition ${
              selected ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white hover:border-gray-400"
            }`}
          >
            <div className="mb-2 text-sm font-semibold">{team.name}</div>
            <div className="space-y-0.5 text-xs">
              <div className={selected ? "text-gray-300" : "text-gray-500"}>
                Group Dealerships: <span className="font-medium">{gdCount}</span>
              </div>
              <div className={selected ? "text-gray-300" : "text-gray-500"}>
                Single Accounts: <span className="font-medium">{singleCount}</span>
              </div>
              <div className={selected ? "text-gray-300" : "text-gray-500"}>
                Total Companies (w/ rooftops): <span className="font-medium">{totalCompanies}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
