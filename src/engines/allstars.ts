/* All-Star nominations and selection: eligibility checks, coach ballots and a transparent tally.
   Nothing here is public; families learn only whether their own child was selected. */
import type { AllStarNomination, AllStarPool, AllStarVote, EligibilityConfig, Player, Registration } from "../core/types";
import { leagueAge } from "./eligibility";

export interface EligibilityCheck { id: string; label: string; ok: boolean; detail: string; }
export function allStarEligibility(player: Player, pool: AllStarPool, reg: Registration | undefined, cfg: EligibilityConfig, gamesPlayed: number | null): EligibilityCheck[] {
  const age = leagueAge(player.birthDate, cfg); const checks: EligibilityCheck[] = [];
  checks.push({ id: "age", label: `League age ${pool.ageMin}–${pool.ageMax}`, ok: age >= pool.ageMin && age <= pool.ageMax, detail: `League age ${age} as of ${cfg.ageDeterminationDate}` });
  checks.push({ id: "division", label: "Rostered in the division this season", ok: !!player.teamId && player.divisionId === pool.divisionId, detail: player.teamId ? "On a team roster" : "Not on a roster" });
  checks.push({ id: "residency", label: "Residence or school eligibility verified", ok: !!reg && (reg.verification.residency === "verified" || reg.verification.residency === "school"), detail: reg ? `Registration: ${reg.verification.residency}` : "No registration for this season" });
  if (pool.minGames > 0) checks.push({ id: "games", label: `Played at least ${pool.minGames} regular-season ${pool.minGames === 1 ? "game" : "games"}`, ok: gamesPlayed === null ? true : gamesPlayed >= pool.minGames, detail: gamesPlayed === null ? "Attendance not recorded; confirm with the coach" : `${gamesPlayed} recorded` });
  return checks;
}
export function isEligible(checks: EligibilityCheck[]) { return checks.every((c) => c.ok); }
export interface TallyRow { playerId: string; points: number; firstPlace: number; ballots: number; nominations: number; rank: number; }
/** Ranked ballot: a player listed first on a ballot of N gets N points, second N-1, and so on. Ties break on first-place votes, then nominations. */
export function tally(pool: AllStarPool, nominations: AllStarNomination[], votes: AllStarVote[]): TallyRow[] {
  const rows = new Map<string, TallyRow>(); const nominated = new Set(nominations.filter((n) => n.poolId === pool.id).map((n) => n.playerId));
  for (const pid of nominated) rows.set(pid, { playerId: pid, points: 0, firstPlace: 0, ballots: 0, nominations: nominations.filter((n) => n.poolId === pool.id && n.playerId === pid).length, rank: 0 });
  for (const v of votes.filter((x) => x.poolId === pool.id)) { const list = v.playerIds.filter((pid) => nominated.has(pid)).slice(0, pool.rosterSize); list.forEach((pid, i) => { const r = rows.get(pid)!; r.points += pool.rosterSize - i; r.ballots++; if (i === 0) r.firstPlace++; }); }
  const out = [...rows.values()].sort((a, b) => b.points - a.points || b.firstPlace - a.firstPlace || b.nominations - a.nominations || a.playerId.localeCompare(b.playerId)); out.forEach((r, i) => (r.rank = i + 1)); return out;
}
export function ballotProblems(pool: AllStarPool, playerIds: string[], nominatedIds: Set<string>, ownPlayerIds: Set<string>): string[] {
  const out: string[] = []; if (playerIds.length === 0) out.push("Rank at least one player."); if (playerIds.length > pool.rosterSize) out.push(`A ballot lists at most ${pool.rosterSize} players.`);
  if (new Set(playerIds).size !== playerIds.length) out.push("A player appears twice."); for (const pid of playerIds) if (!nominatedIds.has(pid)) out.push("A player on the ballot was not nominated.");
  const own = playerIds.filter((pid) => ownPlayerIds.has(pid)).length; if (pool.maxOwnPlayersOnBallot !== null && own > pool.maxOwnPlayersOnBallot) out.push(`At most ${pool.maxOwnPlayersOnBallot} of your own players may be on your ballot (you listed ${own}).`);
  return out;
}
export function suggestedSelection(rows: TallyRow[], rosterSize: number, eligible: Set<string>) { const ranked = rows.filter((r) => eligible.has(r.playerId)); return { selected: ranked.slice(0, rosterSize).map((r) => r.playerId), alternates: ranked.slice(rosterSize, rosterSize + 3).map((r) => r.playerId) }; }
