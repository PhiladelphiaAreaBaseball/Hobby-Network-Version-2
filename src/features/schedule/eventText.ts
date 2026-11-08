import type { ScheduleEvent } from "../../core/types";
import type { Tenant } from "../../core/select";
export function eventTitle(e: ScheduleEvent, t: Tenant): string {
  if (e.type === "game") return `${t.teamName(e.awayTeamId)} at ${t.teamName(e.homeTeamId)}`;
  if (e.type === "practice") return `${t.teamName(e.teamIds[0])} practice`;
  return e.title ?? (e.type === "clinic" ? "Clinic" : "League event");
}
export function eventSubtitle(e: ScheduleEvent, t: Tenant): string {
  const parts = [e.fieldId ? t.fieldById.get(e.fieldId)?.name : undefined, e.divisionId ? t.divisionById.get(e.divisionId)?.shortName : undefined].filter(Boolean);
  if (e.status === "postponed") parts.push("postponed"); if (e.status === "cancelled") parts.push("cancelled");
  return parts.join(" · ");
}
