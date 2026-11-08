export const DAY_MS = 86400000;
export function parseLocal(iso: string): Date { // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm[:ss]" interpreted in local time
  const [d, t] = iso.split("T"); const [y, m, day] = d.split("-").map(Number); const [hh = 0, mm = 0, ss = 0] = (t || "").split(":").map(Number);
  return new Date(y, m - 1, day, hh, mm, ss);
}
export function toIsoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
export function toIsoDateTime(d: Date) { return `${toIsoDate(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`; }
export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function addMinutes(iso: string, n: number) { const d = parseLocal(iso); d.setMinutes(d.getMinutes() + n); return toIsoDateTime(d); }
export function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
export function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) { return parseLocal(iso).toLocaleDateString("en-US", opts); }
export function fmtTime(iso: string) { return parseLocal(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
export function fmtDateTime(iso: string) { return `${fmtDate(iso)} · ${fmtTime(iso)}`; }
export function fmtRange(startIso: string, endIso: string) { return `${fmtTime(startIso)}–${fmtTime(endIso)}`; }
export function relativeDay(iso: string, now = new Date()) { const d = parseLocal(iso); const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY_MS); if (diff === 0) return "Today"; if (diff === 1) return "Tomorrow"; if (diff === -1) return "Yesterday"; if (diff > 1 && diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" }); return fmtDate(iso); }
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) { return aStart < bEnd && bStart < aEnd; }
export function minutesBetween(a: string, b: string) { return Math.round((parseLocal(b).getTime() - parseLocal(a).getTime()) / 60000); }
export function ageOn(birthIso: string, onIso: string) { const b = parseLocal(birthIso), o = parseLocal(onIso); let age = o.getFullYear() - b.getFullYear(); const m = o.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && o.getDate() < b.getDate())) age--; return age; }
export function daysUntil(iso: string, now = new Date()) { return Math.ceil((parseLocal(iso).getTime() - now.getTime()) / DAY_MS); }
