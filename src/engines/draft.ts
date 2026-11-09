/* Tryout ratings and the draft board. Pure functions: pages pass in the tenant collections they already hold.
   Ratings reward observed skills on a 1–5 scale and are averaged across evaluators; the draft is a snake draft. */
import type { Draft, DraftPick, Evaluation, EvalSkill, Player, Team } from "../core/types";

export const EVAL_SKILLS: { id: EvalSkill; label: string; hint: string }[] = [
  { id: "hitting", label: "Hitting", hint: "Contact, swing path, bat speed for the age" },
  { id: "throwing", label: "Throwing", hint: "Arm action, accuracy, carry" },
  { id: "fielding", label: "Fielding", hint: "Glove work, footwork, reads" },
  { id: "running", label: "Running", hint: "Speed and base-running sense" },
  { id: "pitching", label: "Pitching", hint: "Strikes, repeatable delivery (leave blank if not tried)" },
  { id: "coachability", label: "Coachability", hint: "Listens, tries the correction, encourages others" },
];
export const SCORE_LABELS: Record<number, string> = { 1: "Beginning", 2: "Developing", 3: "Solid", 4: "Strong", 5: "Standout" };

export interface PlayerRating { playerId: string; overall: number; bySkill: Partial<Record<EvalSkill, number>>; evaluators: number; notes: string[]; }

/** Averages every evaluator's scores per skill, then averages the skills that were actually scored. */
export function ratePlayers(evals: Evaluation[]): Map<string, PlayerRating> {
  const byPlayer = new Map<string, Evaluation[]>();
  for (const e of evals) (byPlayer.get(e.playerId) ?? byPlayer.set(e.playerId, []).get(e.playerId)!).push(e);
  const out = new Map<string, PlayerRating>();
  for (const [pid, list] of byPlayer) {
    const bySkill: Partial<Record<EvalSkill, number>> = {};
    for (const sk of EVAL_SKILLS) { const vals = list.map((e) => e.scores[sk.id]).filter((v): v is number => typeof v === "number" && v > 0); if (vals.length) bySkill[sk.id] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10; }
    const scored = Object.values(bySkill) as number[];
    out.set(pid, { playerId: pid, overall: scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 100) / 100 : 0, bySkill, evaluators: new Set(list.map((e) => e.evaluatorUserId)).size, notes: list.map((e) => e.notes).filter(Boolean) });
  }
  return out;
}
/** Best available first: overall rating, then number of evaluators (more eyes = more trust), then name order for stability. */
export function rankPool(poolIds: string[], ratings: Map<string, PlayerRating>, nameOf: (id: string) => string): string[] {
  return [...poolIds].sort((a, b) => { const ra = ratings.get(a), rb = ratings.get(b); const d = (rb?.overall ?? 0) - (ra?.overall ?? 0); if (d !== 0) return d; const e = (rb?.evaluators ?? 0) - (ra?.evaluators ?? 0); if (e !== 0) return e; return nameOf(a).localeCompare(nameOf(b)); });
}
export function snakeOrder(teamOrder: string[], round: number): string[] { return round % 2 === 1 ? [...teamOrder].reverse() : teamOrder; }
export interface Clock { teamId: string; round: number; pickInRound: number; overall: number; }
export function onTheClock(draft: Draft): Clock | null {
  const n = draft.picks.length; const teams = draft.teamOrder.length; if (!teams) return null;
  const round = Math.floor(n / teams); if (round >= draft.rounds) return null;
  const pos = n % teams; return { teamId: snakeOrder(draft.teamOrder, round)[pos], round: round + 1, pickInRound: pos + 1, overall: n + 1 };
}
export function availablePool(poolIds: string[], draft: Draft): string[] {
  const taken = new Set([...draft.picks.map((p) => p.playerId), ...Object.values(draft.protectedPlayerIds).flat()]);
  return poolIds.filter((id) => !taken.has(id));
}
export function rosterOfTeam(draft: Draft, teamId: string): string[] { return [...(draft.protectedPlayerIds[teamId] ?? []), ...draft.picks.filter((p) => p.teamId === teamId).map((p) => p.playerId)]; }
export interface TeamStrength { teamId: string; count: number; avg: number; pitchers: number; oldest: number; }
export function teamStrengths(draft: Draft, ratings: Map<string, PlayerRating>, playerById: (id: string) => Player | undefined, maxAge: number): TeamStrength[] {
  return draft.teamOrder.map((teamId) => { const ids = rosterOfTeam(draft, teamId); const rated = ids.map((id) => ratings.get(id)?.overall ?? 0).filter((v) => v > 0); return { teamId, count: ids.length, avg: rated.length ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 100) / 100 : 0, pitchers: ids.filter((id) => (ratings.get(id)?.bySkill.pitching ?? 0) >= 3).length, oldest: ids.filter((id) => (playerById(id)?.leagueAge ?? 0) >= maxAge).length }; });
}
/** Plain-language balance warnings for the commissioner. Never blocks a pick: the human decides. */
export function balanceWarnings(strengths: TeamStrength[], teamName: (id: string) => string, poolLeft: number): string[] {
  const out: string[] = []; const withPlayers = strengths.filter((s) => s.count >= 3 && s.avg > 0); if (withPlayers.length < 2) return out;
  const divAvg = withPlayers.reduce((a, s) => a + s.avg, 0) / withPlayers.length;
  for (const s of withPlayers) { if (s.avg - divAvg >= 0.6) out.push(`${teamName(s.teamId)} averages ${s.avg.toFixed(1)} against a division average of ${divAvg.toFixed(1)}. Consider a lower-rated pick next.`); if (divAvg - s.avg >= 0.6) out.push(`${teamName(s.teamId)} averages ${s.avg.toFixed(1)}, well below the division average of ${divAvg.toFixed(1)}.`); }
  const maxOld = Math.max(...strengths.map((s) => s.oldest)), minOld = Math.min(...strengths.map((s) => s.oldest)); if (maxOld - minOld >= 3) out.push(`Age spread: one team has ${maxOld} players at the top league age and another has ${minOld}.`);
  if (poolLeft <= strengths.length) for (const s of strengths) if (s.count >= 4 && s.pitchers === 0) out.push(`${teamName(s.teamId)} has no player rated 3 or better at pitching.`);
  return out;
}
export function autoPick(available: string[], ratings: Map<string, PlayerRating>, nameOf: (id: string) => string): string | null { return rankPool(available, ratings, nameOf)[0] ?? null; }
export function pickSummary(p: DraftPick, teamName: (id: string) => string, playerName: (id: string) => string) { return `Round ${p.round}, pick ${p.pick}: ${teamName(p.teamId)} select ${playerName(p.playerId)}`; }
export function draftIsComplete(draft: Draft, poolIds: string[]) { return onTheClock(draft) === null || availablePool(poolIds, draft).length === 0; }
export function teamsInDivision(teams: Team[], divisionId: string) { return teams.filter((t) => t.divisionId === divisionId); }
