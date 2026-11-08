import type { ScheduleEvent, Team } from "../core/types";
import { overlaps } from "../core/dates";
export interface Conflict { type: "field" | "team" | "coach" | "umpire"; eventIds: [string, string]; message: string; }
/** Detects double-booked fields, teams playing twice at once, shared coaches, and umpires in two places. */
export function findConflicts(events: ScheduleEvent[], teams: Team[], teamName: (id: string) => string, fieldName: (id: string) => string, userName: (id: string) => string): Conflict[] {
  const live = events.filter((e) => e.status !== "cancelled" && e.status !== "postponed");
  const coachesOf = (teamId: string) => { const t = teams.find((x) => x.id === teamId); return t ? [t.headCoachUserId, ...t.assistantCoachUserIds].filter(Boolean) as string[] : []; };
  const out: Conflict[] = [];
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j]; if (!overlaps(a.start, a.end, b.start, b.end)) continue;
    if (a.fieldId && a.fieldId === b.fieldId) out.push({ type: "field", eventIds: [a.id, b.id], message: `${fieldName(a.fieldId)} is double-booked.` });
    const sharedTeam = a.teamIds.find((t) => b.teamIds.includes(t)); if (sharedTeam) out.push({ type: "team", eventIds: [a.id, b.id], message: `${teamName(sharedTeam)} has two events at the same time.` });
    const ca = new Set(a.teamIds.flatMap(coachesOf)); const sharedCoach = b.teamIds.flatMap(coachesOf).find((c) => ca.has(c));
    if (sharedCoach && !sharedTeam) out.push({ type: "coach", eventIds: [a.id, b.id], message: `${userName(sharedCoach)} coaches two teams scheduled at once.` });
    const sharedUmp = a.umpireUserIds.find((u) => b.umpireUserIds.includes(u)); if (sharedUmp) out.push({ type: "umpire", eventIds: [a.id, b.id], message: `${userName(sharedUmp)} is assigned to two games at once.` });
  }
  return out;
}
export function conflictsFor(eventId: string, conflicts: Conflict[]) { return conflicts.filter((c) => c.eventIds.includes(eventId)); }
/** Validates a proposed event against existing ones. Returns messages; empty means OK. */
export function validateEvent(proposed: ScheduleEvent, existing: ScheduleEvent[], teams: Team[], teamName: (id: string) => string, fieldName: (id: string) => string, userName: (id: string) => string): string[] {
  if (proposed.end <= proposed.start) return ["End time must be after start time."];
  const others = existing.filter((e) => e.id !== proposed.id);
  return findConflicts([proposed, ...others], teams, teamName, fieldName, userName).filter((c) => c.eventIds.includes(proposed.id)).map((c) => c.message);
}
