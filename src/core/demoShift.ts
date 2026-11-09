/* Keeps the demonstration data fresh: every date in the seed moves forward by the number of days since it was
   generated, so "today" always has games, open duties and live deadlines. Birth dates and the league-age
   determination date never move, so eligibility stays exactly as seeded. Saved changes (the overlay) are untouched. */
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(T\d{2}:\d{2}(:\d{2})?)?$/;
const FROZEN_KEYS = new Set(["birthDate", "ageDeterminationDate", "verifiedAt", "founded", "since", "year"]);
export function daysBetween(fromIso: string, toIso: string) { const a = new Date(fromIso.slice(0, 10) + "T12:00:00"); const b = new Date(toIso.slice(0, 10) + "T12:00:00"); return Math.round((b.getTime() - a.getTime()) / 86400000); }
export function shiftDateString(value: string, days: number): string {
  const m = DATE_RE.exec(value); if (!m || days === 0) return value; const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days); const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; return m[4] ? ymd + m[4] : ymd;
}
/** Returns a new object with every ISO date or date-time string shifted, except keys that must stay fixed. */
export function shiftDates<X>(value: X, days: number, key?: string): X {
  if (days === 0) return value;
  if (typeof value === "string") return (key && FROZEN_KEYS.has(key) ? value : shiftDateString(value, days)) as X;
  if (Array.isArray(value)) return value.map((v) => shiftDates(v, days, key)) as X;
  if (value && typeof value === "object") { const out: Record<string, unknown> = {}; for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = FROZEN_KEYS.has(k) ? v : shiftDates(v, days, k); return out as X; }
  return value;
}
export function shiftDemo<X extends { meta?: { seededOn?: string } }>(demo: X, todayIso: string): { demo: X; shiftedDays: number; seededOn: string | null } {
  const seededOn = demo.meta?.seededOn ?? null; if (!seededOn) return { demo, shiftedDays: 0, seededOn };
  const days = daysBetween(seededOn, todayIso); if (days === 0) return { demo, shiftedDays: 0, seededOn };
  const shifted = shiftDates(demo, days); (shifted as any).meta = { ...(demo.meta ?? {}), seededOn, shiftedTo: todayIso, shiftedDays: days }; return { demo: shifted, shiftedDays: days, seededOn };
}
