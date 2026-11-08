import type { Membership, Permission, Role } from "./types";

export const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "Platform Super Administrator", league_admin: "League President / Administrator", board_member: "Board Member", division_commissioner: "Division Commissioner",
  head_coach: "Head Coach", assistant_coach: "Assistant Coach", guardian: "Parent / Guardian", player: "Player", umpire: "Umpire", volunteer: "Volunteer",
};

const ALL_LEAGUE: Permission[] = ["league.manage", "league.settings", "league.website", "league.finance", "league.finance.view", "league.registrations", "league.schedule", "league.fields", "league.volunteers", "league.sponsors", "league.communications", "league.content", "league.reports", "league.members", "division.manage", "team.manage", "team.view", "team.attendance", "team.notes", "team.assign", "team.message", "team.pitching", "team.video_review"];
const COACH: Permission[] = ["team.manage", "team.view", "team.attendance", "team.notes", "team.assign", "team.message", "team.pitching", "team.video_review", "player.academy"];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  platform_admin: ["platform.manage", ...ALL_LEAGUE, "family.academy", "player.academy"],
  league_admin: [...ALL_LEAGUE, "family.academy", "player.academy"],
  board_member: ["league.finance.view", "league.reports", "team.view", "family.academy"], // plus configurable extraPermissions
  division_commissioner: ["division.manage", "league.schedule", "league.registrations", "team.view", "team.manage", "team.message", "league.reports", "family.academy", "player.academy"],
  head_coach: COACH,
  assistant_coach: ["team.view", "team.attendance", "team.message", "team.assign", "player.academy"],
  guardian: ["family.manage", "family.register", "family.pay", "family.academy", "family.messages", "family.video_upload", "team.view", "player.academy"],
  player: ["player.academy"],
  umpire: ["umpire.assignments", "team.view"],
  volunteer: ["volunteer.shifts"],
};

export interface Scope { leagueId?: string; teamId?: string; divisionId?: string; }

/** Server-style authorization check. Memberships are the source of truth; roles never leak across leagues. */
export function can(memberships: Membership[], permission: Permission, scope: Scope = {}): boolean {
  for (const m of memberships) {
    if (m.role === "platform_admin") return true; // platform operators may act anywhere (audited)
    if (scope.leagueId && m.leagueId !== scope.leagueId) continue;
    const perms = new Set<Permission>([...ROLE_PERMISSIONS[m.role], ...(m.extraPermissions ?? [])]);
    if (!perms.has(permission)) continue;
    // team-scoped roles may only act on their own teams; league-wide roles act on any team in the league
    if (scope.teamId && (m.role === "head_coach" || m.role === "assistant_coach")) { if (!(m.teamIds ?? []).includes(scope.teamId)) continue; }
    if (scope.divisionId && m.role === "division_commissioner") { if (!(m.divisionIds ?? []).includes(scope.divisionId)) continue; }
    return true;
  }
  return false;
}
export function hasRole(memberships: Membership[], role: Role, leagueId?: string) { return memberships.some((m) => m.role === role && (!leagueId || m.leagueId === leagueId)); }
export function isAdminish(memberships: Membership[], leagueId: string) { return can(memberships, "league.manage", { leagueId }) || can(memberships, "division.manage", { leagueId }) || hasRole(memberships, "board_member", leagueId); }
export function coachTeamIds(memberships: Membership[], leagueId: string) { return memberships.filter((m) => m.leagueId === leagueId && (m.role === "head_coach" || m.role === "assistant_coach")).flatMap((m) => m.teamIds ?? []); }
