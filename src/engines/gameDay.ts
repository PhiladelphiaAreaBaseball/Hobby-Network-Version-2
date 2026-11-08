/* Game day: lineup cards that respect league minimum-play rules, a simple scorebook, and season playing-time totals.
   Nothing here decides anything for the coach; it builds a fair starting point and explains what the rules require. */
import type { GameSheet, LineupPlan, Player, PlayRules } from "../core/types";

export const POSITIONS = ["P", "C", "1B", "2B", "SS", "3B", "LF", "CF", "RF"] as const;
export const INFIELD = new Set(["P", "C", "1B", "2B", "SS", "3B"]); export const OUTFIELD = new Set(["LF", "CF", "RF"]);
export const BENCH = "Bench";
export const DEFAULT_PLAY_RULES: PlayRules = { minFieldInnings: 2, maxConsecutiveBench: 1, everyoneBats: true, note: "League-configured starting values modeled on common Little League minimum-play rules (six consecutive defensive outs and one at-bat). Verify against the current rulebook and your local rules." };

/** Fair rotation: every active player moves through the infield, outfield and bench; a named pitcher and catcher stay put.
    Bench turns are spread so nobody sits twice before everyone has sat once. */
export function autoRotation(order: string[], innings: number, opts: { pitcherId?: string | null; catcherId?: string | null; fieldSpots?: number } = {}): Record<string, string[]> {
  const spots = Math.min(opts.fieldSpots ?? 9, 9); const fixed = new Map<string, string>(); if (opts.pitcherId && order.includes(opts.pitcherId)) fixed.set(opts.pitcherId, "P"); if (opts.catcherId && order.includes(opts.catcherId) && opts.catcherId !== opts.pitcherId) fixed.set(opts.catcherId, "C");
  const rotating = order.filter((id) => !fixed.has(id)); const openPositions = POSITIONS.slice(0, spots).filter((p) => ![...fixed.values()].includes(p));
  const out: Record<string, string[]> = {}; for (const id of order) out[id] = [];
  const benchPerInning = Math.max(0, rotating.length - openPositions.length);
  for (let inn = 0; inn < innings; inn++) {
    for (const [id, pos] of fixed) out[id].push(pos);
    // players sit in a rolling window so bench time is evenly distributed
    const benchStart = (inn * benchPerInning) % Math.max(1, rotating.length); const bench = new Set<string>(); for (let k = 0; k < benchPerInning; k++) bench.add(rotating[(benchStart + k) % rotating.length]);
    let slot = 0; rotating.forEach((id, idx) => { if (bench.has(id)) { out[id].push(BENCH); return; } const pos = openPositions[(slot + inn * 3 + idx) % openPositions.length]; out[id].push(pos); slot++; });
    // repair duplicates created by the offset: assign leftover positions to any duplicates in order
    const used = new Set<string>(); const dupes: string[] = []; for (const id of rotating) { const pos = out[id][inn]; if (pos === BENCH) continue; if (used.has(pos)) dupes.push(id); else used.add(pos); }
    const free = openPositions.filter((p) => !used.has(p)); for (const id of dupes) { const p = free.shift(); out[id][inn] = p ?? BENCH; }
  }
  return out;
}
export interface LineupWarning { kind: "rule" | "safety" | "lineup"; text: string; playerId?: string; }
export function lineupWarnings(plan: LineupPlan, roster: Player[], innings: number, rules: PlayRules, pitcherEligible?: (pid: string) => { eligibleToday: boolean; nextEligible: string } | null): LineupWarning[] {
  const out: LineupWarning[] = []; const nameOf = (id: string) => { const p = roster.find((x) => x.id === id); return p ? `${p.firstName} ${p.lastName}` : id; };
  const active = plan.order.filter((id) => !plan.absent.includes(id));
  if (rules.everyoneBats) for (const p of roster) if (!plan.order.includes(p.id) && !plan.absent.includes(p.id)) out.push({ kind: "rule", text: `${nameOf(p.id)} is not in the batting order. Every present player must bat.`, playerId: p.id });
  for (const id of active) {
    const row = plan.positions[id] ?? []; const field = row.filter((p) => p && p !== BENCH).length; if (field < rules.minFieldInnings) out.push({ kind: "rule", text: `${nameOf(id)} plays only ${field} defensive ${field === 1 ? "inning" : "innings"}; the league minimum is ${rules.minFieldInnings}.`, playerId: id });
    let run = 0, maxRun = 0; for (const p of row) { run = p === BENCH ? run + 1 : 0; maxRun = Math.max(maxRun, run); } if (maxRun > rules.maxConsecutiveBench) out.push({ kind: "rule", text: `${nameOf(id)} sits ${maxRun} innings in a row; the limit is ${rules.maxConsecutiveBench}.`, playerId: id });
    if (row.includes("P") && pitcherEligible) { const st = pitcherEligible(id); if (st && !st.eligibleToday) out.push({ kind: "safety", text: `${nameOf(id)} is listed at pitcher but is on required rest until ${st.nextEligible}.`, playerId: id }); }
    if (row.includes("P") && row.filter((p) => p === "C").length >= 4) out.push({ kind: "safety", text: `${nameOf(id)} catches four or more innings and also pitches. Under common Little League rules a player who catches four innings may not pitch that day.`, playerId: id });
  }
  for (let inn = 0; inn < innings; inn++) { const seen = new Map<string, string>(); for (const id of active) { const p = plan.positions[id]?.[inn]; if (!p || p === BENCH) continue; if (seen.has(p)) out.push({ kind: "lineup", text: `Inning ${inn + 1}: ${nameOf(seen.get(p)!)} and ${nameOf(id)} are both at ${p}.` }); else seen.set(p, id); } const missing = POSITIONS.filter((p) => !seen.has(p)); if (active.length >= 9 && missing.length) out.push({ kind: "lineup", text: `Inning ${inn + 1}: nobody at ${missing.join(", ")}.` }); }
  return out;
}
export function scoreTotals(innings: GameSheet["innings"]) { return { away: innings.reduce((a, i) => a + (i.top ?? 0), 0), home: innings.reduce((a, i) => a + (i.bottom ?? 0), 0) }; }
export function ordinal(n: number) { const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]); }
export function statusLine(sheet: GameSheet) { if (sheet.status === "final") return "Final"; if (sheet.status === "pre") return "Not started"; return `${sheet.current.half === "top" ? "Top" : "Bottom"} ${ordinal(sheet.current.inning)} · ${sheet.current.outs} ${sheet.current.outs === 1 ? "out" : "outs"}`; }
export function emptySheet(eventId: string, leagueId: string, innings: number): Omit<GameSheet, "updatedAt"> { return { id: `gs_${eventId}`, leagueId, eventId, status: "pre", innings: Array.from({ length: innings }, () => ({ top: null, bottom: null })), current: { inning: 1, half: "top", outs: 0 }, lineups: {}, pitchers: {} }; }
/** Advances outs → half-innings → innings. A completed half with no runs recorded counts as zero. */
export function advanceOut(sheet: GameSheet): GameSheet {
  const cur = { ...sheet.current }; const innings = sheet.innings.map((i) => ({ ...i }));
  if (cur.outs < 2) return { ...sheet, current: { ...cur, outs: cur.outs + 1 } };
  const idx = cur.inning - 1; if (!innings[idx]) innings[idx] = { top: null, bottom: null };
  if (cur.half === "top") { innings[idx].top = innings[idx].top ?? 0; return { ...sheet, innings, current: { inning: cur.inning, half: "bottom", outs: 0 } }; }
  innings[idx].bottom = innings[idx].bottom ?? 0; if (!innings[idx + 1]) innings.push({ top: null, bottom: null });
  return { ...sheet, innings, current: { inning: cur.inning + 1, half: "top", outs: 0 } };
}
export function addRun(sheet: GameSheet, delta: number): GameSheet {
  const innings = sheet.innings.map((i) => ({ ...i })); const idx = sheet.current.inning - 1; if (!innings[idx]) innings[idx] = { top: null, bottom: null };
  const key = sheet.current.half; innings[idx][key] = Math.max(0, (innings[idx][key] ?? 0) + delta); return { ...sheet, innings };
}
export interface PlayingTime { playerId: string; games: number; fieldInnings: number; benchInnings: number; infield: number; outfield: number; pitched: number; catcherInnings: number; }
export function playingTime(sheets: GameSheet[], teamId: string, roster: Player[]): PlayingTime[] {
  return roster.map((p) => { const row: PlayingTime = { playerId: p.id, games: 0, fieldInnings: 0, benchInnings: 0, infield: 0, outfield: 0, pitched: 0, catcherInnings: 0 }; for (const s of sheets) { const lu = s.lineups[teamId]; if (!lu || s.status !== "final") continue; const pos = lu.positions[p.id]; if (!pos || lu.absent.includes(p.id)) continue; row.games++; for (const x of pos) { if (!x) continue; if (x === BENCH) row.benchInnings++; else { row.fieldInnings++; if (INFIELD.has(x)) row.infield++; if (OUTFIELD.has(x)) row.outfield++; if (x === "P") row.pitched++; if (x === "C") row.catcherInnings++; } } } return row; });
}
export function fairnessNotes(rows: PlayingTime[], nameOf: (id: string) => string): string[] {
  const played = rows.filter((r) => r.games > 0); if (played.length < 2) return [];
  const avg = played.reduce((a, r) => a + r.fieldInnings / r.games, 0) / played.length; const out: string[] = [];
  for (const r of played) { const per = r.fieldInnings / r.games; if (avg - per >= 1.25) out.push(`${nameOf(r.playerId)} averages ${per.toFixed(1)} defensive innings per game against a team average of ${avg.toFixed(1)}.`); if (r.games >= 3 && r.infield === 0) out.push(`${nameOf(r.playerId)} has not played an infield inning yet this season.`); }
  return out;
}
