import type { ScheduleEvent } from "../core/types";
import { parseLocal } from "../core/dates";
const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (iso: string) => { const d = parseLocal(iso); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`; };
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
export function buildIcs(events: ScheduleEvent[], title: (e: ScheduleEvent) => string, location: (e: ScheduleEvent) => string, calName: string): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GamePlanIQ//League Calendar//EN", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${esc(calName)}`];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@gameplaniq`, `DTSTAMP:${stamp(e.updatedAt || e.start)}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`, `SUMMARY:${esc(title(e))}`, `LOCATION:${esc(location(e))}`, `STATUS:${e.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`);
    if (e.notes) lines.push(`DESCRIPTION:${esc(e.notes)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
