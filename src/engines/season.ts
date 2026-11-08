/* Season rollover: what changes when a league closes one season and opens the next. Pure preview so the
   administrator sees every count before confirming; the action in core/actions applies it. */
import type { Division, Draft, EligibilityConfig, Player, Registration, Season, Team } from "../core/types";
import { leagueAge } from "./eligibility";

export interface RolloverPreview { from: Season; to: Season; teams: number; divisions: number; draftsToApply: Draft[]; placedByDraft: number; keepTeam: number; leaveTeam: number; newRegistrations: number; ageChanges: number; warnings: string[]; }
const ACTIVE_REG = new Set(["submitted", "pending_documents", "approved", "assigned", "waitlisted"]);
export function rolloverPreview(args: { from: Season; to: Season; teams: Team[]; divisions: Division[]; players: Player[]; registrations: Registration[]; drafts: Draft[]; eligibility: EligibilityConfig }): RolloverPreview {
  const { from, to, teams, divisions, players, registrations, drafts, eligibility } = args;
  const regs = registrations.filter((r) => r.seasonId === to.id && ACTIVE_REG.has(r.status)); const registered = new Set(regs.map((r) => r.playerId));
  const draftsToApply = drafts.filter((d) => d.seasonId === to.id && d.status === "complete" && !d.rostersApplied);
  const placed = new Set(draftsToApply.flatMap((d) => [...d.picks.map((p) => p.playerId), ...Object.values(d.protectedPlayerIds).flat()]));
  const rostered = players.filter((p) => p.teamId); const keepTeam = rostered.filter((p) => registered.has(p.id) && !placed.has(p.id)).length; const leaveTeam = rostered.filter((p) => !registered.has(p.id) && !placed.has(p.id)).length;
  const ageChanges = players.filter((p) => leagueAge(p.birthDate, eligibility) !== p.leagueAge).length;
  const warnings: string[] = [];
  if (to.status === "complete") warnings.push(`${to.name} is already marked complete.`); if (from.id === to.id) warnings.push("Choose two different seasons.");
  if (drafts.some((d) => d.seasonId === to.id && d.status === "live")) warnings.push("A draft for the new season is still live; finalize it first or its picks will not be applied.");
  if (ageChanges === 0 && players.length > 0) warnings.push("No league ages change. Update the age determination date in Eligibility before rolling over if the new season uses a new chart.");
  if (leaveTeam > 0) warnings.push(`${leaveTeam} rostered players have no registration for ${to.name} and will be moved off their teams.`);
  return { from, to, teams: teams.length, divisions: divisions.length, draftsToApply, placedByDraft: placed.size, keepTeam, leaveTeam, newRegistrations: regs.length, ageChanges, warnings };
}
export function nextSeasonFor(seasons: Season[], current: Season | undefined): Season | undefined { return seasons.filter((s) => s.id !== current?.id && s.status !== "complete").sort((a, b) => (a.startDate < b.startDate ? -1 : 1))[0]; }
