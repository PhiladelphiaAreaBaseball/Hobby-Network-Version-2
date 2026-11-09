/* Notification rules: who is told what, when, and where a notification links to.
   The catalog is the single place that defines each event's audience, topic category and urgency. Actions call
   `audienceFor` to resolve recipients and `deliveryPlan` to apply each person's preferences and the league's quiet hours. */
import type { League, NotificationPrefs, Player, Team, VolunteerShift } from "../core/types";
import { parseRoute, type Route } from "../core/router";
import { parseLocal, toIsoDateTime } from "../core/dates";

export type NotifyCategory = "schedule" | "messages" | "assignments" | "registration" | "volunteer" | "fundraising" | "development" | "tryouts" | "safety" | "league";
export interface NotifyRule { kind: string; label: string; category: NotifyCategory; audience: string; urgent: boolean; digestible: boolean; }
/** `kind` values match what actions pass to `notify`; the audience text is shown to administrators in Communications. */
export const NOTIFY_RULES: NotifyRule[] = [
  { kind: "schedule", label: "Schedule change, rainout, field status, final score", category: "schedule", audience: "Families and coaches of every team on the event", urgent: true, digestible: false },
  { kind: "message", label: "New team or direct message", category: "messages", audience: "Participants in the conversation other than the sender", urgent: false, digestible: true },
  { kind: "assignment", label: "Home practice assigned", category: "assignments", audience: "Guardians of each assigned player", urgent: false, digestible: true },
  { kind: "report", label: "Report card published or acknowledged", category: "development", audience: "Guardians of the player; the coach on acknowledgement", urgent: false, digestible: true },
  { kind: "registration", label: "Registration received, approved, waitlisted, documents", category: "registration", audience: "The registering guardian", urgent: false, digestible: true },
  { kind: "team", label: "Placed on a team", category: "registration", audience: "Guardians of the player", urgent: false, digestible: true },
  { kind: "volunteer", label: "Duty claimed, reminder, open slots", category: "volunteer", audience: "The volunteer; team families when a coach asks for help", urgent: false, digestible: true },
  { kind: "video", label: "Video feedback", category: "development", audience: "The guardian who uploaded the clip", urgent: false, digestible: true },
  { kind: "tryout", label: "Assigned as an evaluator", category: "tryouts", audience: "Named evaluators", urgent: false, digestible: true },
  { kind: "draft", label: "Draft live, on the clock", category: "tryouts", audience: "Coaches of the teams in the draft", urgent: true, digestible: false },
  { kind: "certification", label: "Certification expiring", category: "safety", audience: "The coach or volunteer", urgent: false, digestible: true },
  { kind: "safety", label: "Incident reported, background check due", category: "safety", audience: "Safety officer and league president; the volunteer for a check", urgent: false, digestible: true },
  { kind: "announcement", label: "League, division or team announcement", category: "league", audience: "Everyone in the audience the author chose", urgent: false, digestible: true },
];
export const CATEGORY_LABEL: Record<NotifyCategory, string> = { schedule: "Schedule", messages: "Messages", assignments: "Home practice", registration: "Registration", volunteer: "Duties", fundraising: "Fundraising", development: "Development", tryouts: "Tryouts & draft", safety: "Safety", league: "League news" };
const PREF_KEY: Record<NotifyCategory, keyof NotificationPrefs["categories"] | null> = { schedule: "schedule", messages: "messages", assignments: "assignments", registration: "registration", volunteer: "volunteer", fundraising: "fundraising", development: "assignments", tryouts: null, safety: null, league: null };
export function ruleFor(kind: string): NotifyRule { return NOTIFY_RULES.find((r) => r.kind === kind) ?? { kind, label: kind, category: "league", audience: "As addressed", urgent: false, digestible: true }; }
export function categoryOf(kind: string): NotifyCategory { return ruleFor(kind).category; }
/** Safety-critical kinds (rainouts, finals, on-the-clock) always deliver; everything else honours the topic switches. */
export function wantsCategory(prefs: NotificationPrefs | undefined, kind: string): boolean { const rule = ruleFor(kind); if (rule.urgent) return true; const key = PREF_KEY[rule.category]; if (!key) return true; return prefs?.categories?.[key] !== false; }
/** Quiet hours: non-urgent notifications created inside the window are stamped to deliver when the window ends. In-app they still appear; email and push honour `deliverAt`. */
export function deliverAtFor(nowIso: string, comms: League["settings"]["communications"], kind: string): string | null {
  if (ruleFor(kind).urgent) return null; const [sh, sm] = comms.quietHoursStart.split(":").map(Number); const [eh, em] = comms.quietHoursEnd.split(":").map(Number); if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const now = parseLocal(nowIso); const mins = now.getHours() * 60 + now.getMinutes(); const start = sh * 60 + sm, end = eh * 60 + em;
  const inQuiet = start > end ? mins >= start || mins < end : mins >= start && mins < end; if (!inQuiet) return null;
  const d = new Date(now); if (start > end && mins >= start) d.setDate(d.getDate() + 1); d.setHours(eh, em, 0, 0); return toIsoDateTime(d);
}
export function dedupeKey(userId: string, kind: string, link?: string, title?: string) { return `${userId}|${kind}|${link ?? title ?? ""}`; }
/** Resolves a stored link token ("thread-th01", "gameday-ev0302", "home") to a route the app can navigate to. */
export function resolveLink(link?: string): Route { return parseRoute("#" + (link ?? "home")); }
/* ---- audience helpers ---- */
export function familiesOfTeams(teamIds: string[], players: Player[], teams: Team[], includeCoaches = true): string[] {
  const users = new Set<string>(); for (const id of teamIds) { const team = teams.find((x) => x.id === id); if (includeCoaches) { if (team?.headCoachUserId) users.add(team.headCoachUserId); for (const a of team?.assistantCoachUserIds ?? []) users.add(a); } for (const p of players) if (p.teamId === id) p.guardianUserIds.forEach((g) => users.add(g)); } return [...users];
}
export function guardiansOf(playerIds: string[], players: Player[]): string[] { return [...new Set(playerIds.flatMap((pid) => players.find((p) => p.id === pid)?.guardianUserIds ?? []))]; }
export function dutyReminderWindow(shift: VolunteerShift, nowIso: string): "today" | "tomorrow" | null { const d = shift.start.slice(0, 10); const now = parseLocal(nowIso); const today = toIsoDateTime(now).slice(0, 10); const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1); const tomorrow = toIsoDateTime(tmr).slice(0, 10); return d === today ? "today" : d === tomorrow ? "tomorrow" : null; }
