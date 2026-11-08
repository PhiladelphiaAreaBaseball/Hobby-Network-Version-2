import type { ScheduleEvent, Team } from "../core/types";
export interface StandingRow { teamId: string; wins: number; losses: number; ties: number; runsFor: number; runsAgainst: number; pct: number; }
export function standings(teams: Team[], events: ScheduleEvent[], divisionId?: string, seasonId?: string): StandingRow[] {
  const rows = new Map<string, StandingRow>(); for (const t of teams) if (!divisionId || t.divisionId === divisionId) rows.set(t.id, { teamId: t.id, wins: 0, losses: 0, ties: 0, runsFor: 0, runsAgainst: 0, pct: 0 });
  for (const e of events) {
    if (e.type !== "game" || e.status !== "completed" || !e.result || !e.homeTeamId || !e.awayTeamId) continue; if (seasonId && e.seasonId !== seasonId) continue;
    const h = rows.get(e.homeTeamId), a = rows.get(e.awayTeamId); if (!h || !a) continue;
    h.runsFor += e.result.homeScore; h.runsAgainst += e.result.awayScore; a.runsFor += e.result.awayScore; a.runsAgainst += e.result.homeScore;
    if (e.result.homeScore > e.result.awayScore) { h.wins++; a.losses++; } else if (e.result.homeScore < e.result.awayScore) { a.wins++; h.losses++; } else { h.ties++; a.ties++; }
  }
  const out = [...rows.values()]; for (const r of out) { const g = r.wins + r.losses + r.ties; r.pct = g ? (r.wins + r.ties * 0.5) / g : 0; }
  return out.sort((x, y) => y.pct - x.pct || (y.runsFor - y.runsAgainst) - (x.runsFor - x.runsAgainst));
}
