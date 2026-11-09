import type { PitchCountConfig, PitchingAppearance } from "../core/types";
import { addDays, parseLocal, toIsoDate } from "../core/dates";
export function maxPitchesFor(leagueAge: number, cfg: PitchCountConfig) { return cfg.maxPitchesByLeagueAge.find((b) => leagueAge >= b.minAge && leagueAge <= b.maxAge)?.maxPitches ?? null; }
export function restDaysFor(pitches: number, cfg: PitchCountConfig) { const r = cfg.restDays.find((b) => pitches >= b.minPitches && pitches <= b.maxPitches); return r ? r.restDays : cfg.restDays[cfg.restDays.length - 1]?.restDays ?? 0; }
export interface PitcherStatus { eligibleToday: boolean; nextEligible: string; lastOuting: PitchingAppearance | null; requiredRest: number; maxToday: number | null; last7Days: number; seasonPitches: number; note: string; }
/** Rest-day logic: a pitcher who throws N pitches on day D must rest the configured number of calendar days before pitching again. */
export function pitcherStatus(appearances: PitchingAppearance[], leagueAge: number, cfg: PitchCountConfig, today: string): PitcherStatus {
  const sorted = [...appearances].sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = sorted[0] ?? null; const maxToday = maxPitchesFor(leagueAge, cfg);
  let nextEligible = today; let requiredRest = 0;
  if (last) { requiredRest = restDaysFor(last.pitches, cfg); nextEligible = toIsoDate(addDays(parseLocal(last.date), requiredRest + 1)); }
  const t = parseLocal(today).getTime(); const last7 = sorted.filter((a) => t - parseLocal(a.date).getTime() <= 6 * 86400000 && parseLocal(a.date).getTime() <= t).reduce((s, a) => s + a.pitches, 0);
  const season = sorted.reduce((s, a) => s + a.pitches, 0);
  const eligibleToday = !last || nextEligible <= today;
  const note = !last ? "No recorded outings." : eligibleToday ? `Last outing ${last.pitches} pitches on ${last.date}; rest complete.` : `Threw ${last.pitches} on ${last.date}: ${requiredRest} calendar day${requiredRest === 1 ? "" : "s"} of rest required. Eligible ${nextEligible}.`;
  return { eligibleToday, nextEligible, lastOuting: last, requiredRest, maxToday, last7Days: last7, seasonPitches: season, note };
}
