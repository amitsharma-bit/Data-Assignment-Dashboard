import type { TeamRecord } from "./types";

/**
 * The four sales teams the Overview leaderboard cares about, matched by
 * name rather than a hardcoded HubSpot team id (ids are portal-specific and
 * would silently break the leaderboard if a team were ever recreated).
 * Order here is the display order on the leaderboard.
 */
const SALES_TEAM_NAME_MATCHERS = ["neelima", "archit", "prince", "saarthak"];

export function getSalesTeams(teams: TeamRecord[]): TeamRecord[] {
  const matched: TeamRecord[] = [];
  for (const matcher of SALES_TEAM_NAME_MATCHERS) {
    const team = teams.find((t) => t.name?.toLowerCase().includes(matcher));
    if (team) matched.push(team);
  }
  return matched;
}
