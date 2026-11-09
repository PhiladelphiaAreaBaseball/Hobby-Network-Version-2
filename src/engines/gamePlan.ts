/* The head coach's private game plan: who plays where in each inning, worked out before game day.
   Columns follow the paper sheet coaches already use: eight field positions, the pitcher, the relief pitcher who is
   ready but not in the field, and two roster (sitting) spots. Each slot holds one player; a player fills at most one
   slot per inning. Everything here is advisory; nothing blocks the coach. */
import type { GamePlan, LineupPlan, Player, PlayRules } from "../core/types";

export const PLAN_COLUMNS: { key: string; label: string; field: boolean; hint: string }[] = [
  { key: "3B", label: "3B", field: true, hint: "Third base" }, { key: "SS", label: "SS", field: true, hint: "Shortstop" }, { key: "2B", label: "2B", field: true, hint: "Second base" }, { key: "1B", label: "1B", field: true, hint: "First base" },
  { key: "LF", label: "LF", field: true, hint: "Left field" }, { key: "CF", label: "CF", field: true, hint: "Center field" }, { key: "RF", label: "RF", field: true, hint: "Right field" }, { key: "C", label: "C", field: true, hint: "Catcher" },
  { key: "P", label: "Pitcher", field: true, hint: "Starting pitcher for the inning" }, { key: "RP", label: "Relief", field: false, hint: "Ready to pitch if needed; not in the field" },
  { key: "R1", label: "Roster", field: false, hint: "Sitting this inning" }, { key: "R2", label: "Roster", field: false, hint: "Sitting this inning" },
];
export const PLAN_INNINGS = 6;
export type PlanRow = Record<string, string>;
export function emptyRows(n = PLAN_INNINGS): PlanRow[] { return Array.from({ length: n }, () => Object.fromEntries(PLAN_COLUMNS.map((c) => [c.key, ""]))); }

export interface PlanIssue { level: "error" | "warn" | "info"; inning?: number; key?: string; playerId?: string; text: string; }
export interface PlayerLine { playerId: string; field: number; off: number; unplaced: number; pitched: number; caught: number; positions: Record<string, number>; }

/** Per-player innings in the field, off the field (relief or roster), and by position. */
export function playerLines(rows: PlanRow[], roster: Player[]): PlayerLine[] {
  return roster.map((p) => { const line: PlayerLine = { playerId: p.id, field: 0, off: 0, unplaced: 0, pitched: 0, caught: 0, positions: {} };
    for (const row of rows) { const key = PLAN_COLUMNS.find((c) => row[c.key] === p.id)?.key; if (!key) { if (Object.values(row).some(Boolean)) line.unplaced++; continue; } const col = PLAN_COLUMNS.find((c) => c.key === key)!; if (col.field) { line.field++; const short = col.key === "P" ? "P" : col.label; line.positions[short] = (line.positions[short] ?? 0) + 1; if (key === "P") line.pitched++; if (key === "C") line.caught++; } else line.off++; }
    return line; });
}
/** Problems a coach would want to know before first pitch. `pitcherOk` reports whether a player may pitch on the game date. */
export function planIssues(rows: PlanRow[], roster: Player[], rules: PlayRules | undefined, pitcherOk?: (playerId: string) => { ok: boolean; note: string }): PlanIssue[] {
  const out: PlanIssue[] = []; const name = (id: string) => roster.find((p) => p.id === id)?.displayName ?? "A player"; const used = rows.filter((r) => Object.values(r).some(Boolean));
  rows.forEach((row, i) => {
    const inning = i + 1; if (!Object.values(row).some(Boolean)) return;
    const seen = new Map<string, string>(); for (const c of PLAN_COLUMNS) { const pid = row[c.key]; if (!pid) continue; if (seen.has(pid)) out.push({ level: "error", inning, key: c.key, playerId: pid, text: `Inning ${inning}: ${name(pid)} is in ${seen.get(pid)} and ${c.label}.` }); else seen.set(pid, c.label); }
    const emptyField = PLAN_COLUMNS.filter((c) => c.field && !row[c.key]).map((c) => c.label); if (emptyField.length) out.push({ level: "warn", inning, text: `Inning ${inning}: nobody at ${emptyField.join(", ")}.` });
    const missing = roster.filter((p) => !seen.has(p.id)); if (missing.length) out.push({ level: "info", inning, text: `Inning ${inning}: not placed: ${missing.map((p) => p.displayName).join(", ")}.` });
  });
  const pitchers = [...new Set(rows.flatMap((r) => [r.P, r.RP]).filter(Boolean))];
  if (pitcherOk) for (const pid of pitchers) { const s = pitcherOk(pid); if (!s.ok) out.push({ level: "warn", playerId: pid, text: `${name(pid)} is planned to pitch but ${s.note}.` }); }
  const lines = playerLines(rows, roster);
  for (const l of lines) { if (l.caught >= 4 && l.pitched > 0) out.push({ level: "warn", playerId: l.playerId, text: `${name(l.playerId)} catches ${l.caught} innings and also pitches; Little League does not allow pitching after catching four or more innings in a day.` }); }
  if (rules && used.length >= rules.minFieldInnings) for (const l of lines) { if (l.field + l.off + l.unplaced === 0) continue; if (l.field < rules.minFieldInnings) out.push({ level: "warn", playerId: l.playerId, text: `${name(l.playerId)} is in the field ${l.field} ${l.field === 1 ? "inning" : "innings"}; the league minimum is ${rules.minFieldInnings}.` }); }
  return out;
}
export function copyRow(rows: PlanRow[], from: number, to: number): PlanRow[] { return rows.map((r, i) => (i === to ? { ...rows[from] } : r)); }
/** Converts a plan into the game-day lineup card format (positions per inning, "Bench" when off the field). */
export function planToLineup(plan: Pick<GamePlan, "innings">, roster: Player[], existing?: LineupPlan): Omit<LineupPlan, "updatedAt" | "byUserId"> {
  const order = existing?.order?.length ? [...existing.order, ...roster.map((p) => p.id).filter((id) => !existing.order.includes(id))] : roster.map((p) => p.id);
  const positions: Record<string, string[]> = {}; for (const p of roster) positions[p.id] = plan.innings.map((row) => { const col = PLAN_COLUMNS.find((c) => row[c.key] === p.id); return col && col.field ? (col.key === "P" ? "P" : col.key) : "Bench"; });
  const absent = roster.filter((p) => plan.innings.every((row) => !Object.values(row).includes(p.id))).map((p) => p.id);
  return { order, positions, absent };
}
