/* Daily and weekly digest: one honest summary of what a family or coach needs to know, built from the same sources
   as the calendar and notification center. Rendered on the home page and exportable as text for email. */
import type { IcsItem } from "./familyCalendar";
import type { Notification, ReportCard, ScheduleEvent, Team, Draft, Tryout } from "../core/types";
import { addDays, parseLocal, toIsoDate } from "../core/dates";
import { onTheClock } from "./draft";

export type DigestRange = "today" | "week";
export interface DigestLine { text: string; link?: string; tone?: "urgent" | "action" | "info"; when?: string; }
export interface DigestSection { id: string; title: string; lines: DigestLine[]; }
export interface Digest { range: DigestRange; from: string; to: string; sections: DigestSection[]; headline: string; actionCount: number; }
export interface DigestInput {
  today: string; items: IcsItem[]; notifications: Notification[]; unreadCount: number; fieldsNotOpen: { name: string; status: string; note?: string }[];
  reportCards: ReportCard[]; coachTeams: Team[]; nextGames: { team: Team; event: ScheduleEvent; hasLineup: boolean; openDuties: number }[]; cardsToWrite: { team: Team; count: number }[]; drafts: Draft[]; tryouts: Tryout[]; userId: string; isCoach: boolean; childrenNames: string[];
}
function fmtWhen(iso: string) { const d = parseLocal(iso.length === 10 ? iso + "T00:00:00" : iso); const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); return iso.length === 10 ? day : `${day} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`; }
export function buildDigest(input: DigestInput, range: DigestRange): Digest {
  const from = input.today; const to = toIsoDate(addDays(parseLocal(input.today), range === "today" ? 0 : 6)); const inRange = (iso: string) => { const d = iso.slice(0, 10); return d >= from && d <= to; };
  const sections: DigestSection[] = []; let actions = 0;
  if (input.fieldsNotOpen.length) sections.push({ id: "fields", title: "Field status", lines: input.fieldsNotOpen.map((f) => ({ text: `${f.name} is ${f.status.replace("_", " ")}${f.note ? `: ${f.note}` : ""}`, link: "league-fields", tone: "urgent" as const })) });
  const games = input.items.filter((i) => (i.category === "game" || i.category === "event") && inRange(i.start)); const practices = input.items.filter((i) => i.category === "practice" && inRange(i.start));
  if (games.length || practices.length) sections.push({ id: "schedule", title: range === "today" ? "Today on the field" : "This week on the field", lines: [...games, ...practices].sort((a, b) => (a.start < b.start ? -1 : 1)).map((i) => ({ text: `${i.summary}${i.location ? ` · ${i.location}` : ""}`, when: fmtWhen(i.start), link: i.uid.startsWith("ev-") ? `event-${i.uid.slice(3)}` : "schedule", tone: i.cancelled ? "urgent" as const : "info" as const })) });
  const duties = input.items.filter((i) => i.category === "duty" && inRange(i.start)); if (duties.length) { actions += duties.length; sections.push({ id: "duties", title: "Your duties", lines: duties.map((i) => ({ text: i.summary.replace(/^Duty: /, ""), when: fmtWhen(i.start), link: i.uid.startsWith("duty-") ? "team" : "volunteer", tone: "action" as const })) }); }
  const homework = input.items.filter((i) => i.category === "deadline" && i.uid.startsWith("asg-") && (inRange(i.start) || i.start < from)); if (homework.length) { actions += homework.length; sections.push({ id: "homework", title: "Home practice", lines: homework.map((i) => ({ text: `${i.summary}${i.start < from ? " (overdue)" : ""}${i.description ? ` · ${i.description}` : ""}`, when: fmtWhen(i.start), link: "home", tone: i.start < from ? "urgent" as const : "action" as const })) }); }
  const newCards = input.reportCards.filter((c) => c.status === "published" && !c.parentAcknowledgedAt); if (newCards.length) { actions += newCards.length; sections.push({ id: "reports", title: "Report cards to read", lines: newCards.map((c) => ({ text: `${c.period === "mid" ? "Mid-season" : "End-of-season"} report card is waiting`, link: `report-${c.id}`, tone: "action" as const })) }); }
  const deadlines = input.items.filter((i) => (i.category === "deadline" && !i.uid.startsWith("asg-") || i.category === "tryout" || i.category === "renewal") && (range === "week" ? i.start.slice(0, 10) <= toIsoDate(addDays(parseLocal(input.today), 30)) : inRange(i.start))); if (deadlines.length) { sections.push({ id: "deadlines", title: "Coming deadlines", lines: deadlines.map((i) => ({ text: i.summary, when: fmtWhen(i.start), link: i.uid.startsWith("try-") ? `tryout-${i.uid.slice(4)}` : i.uid.startsWith("cert-") ? "coaches-certification" : i.uid.startsWith("reg-") ? "register" : "schedule", tone: i.category === "renewal" ? "action" as const : "info" as const })) }); }
  if (input.isCoach) {
    const lines: DigestLine[] = [];
    for (const g of input.nextGames) if (inRange(g.event.start) || range === "week") { if (!g.hasLineup) { actions++; lines.push({ text: `${g.team.name}: no lineup card yet for ${fmtWhen(g.event.start)}`, link: `gameday-${g.event.id}`, tone: "action" }); } if (g.openDuties) { actions++; lines.push({ text: `${g.team.name}: ${g.openDuties} open ${g.openDuties === 1 ? "duty" : "duties"} for the next game`, link: `team-${g.team.id}`, tone: "action" }); } }
    for (const c of input.cardsToWrite) if (c.count) lines.push({ text: `${c.team.name}: ${c.count} report ${c.count === 1 ? "card" : "cards"} not started`, link: `coaches-team-${c.team.id}`, tone: "info" });
    for (const d of input.drafts) { const clock = d.status === "live" ? onTheClock(d) : null; if (clock && input.coachTeams.some((t) => t.id === clock.teamId)) { actions++; lines.push({ text: `${d.title}: your team is on the clock`, link: `draft-${d.id}`, tone: "urgent" }); } else if (d.status === "live") lines.push({ text: `${d.title} is live`, link: `draft-${d.id}`, tone: "info" }); }
    for (const tr of input.tryouts) if (tr.evaluatorUserIds.includes(input.userId) && tr.status !== "complete" && inRange(tr.date)) lines.push({ text: `You evaluate at ${tr.title}`, when: fmtWhen(`${tr.date}T${tr.startTime}:00`), link: `tryout-${tr.id}`, tone: "action" });
    if (lines.length) sections.push({ id: "coach", title: "Coaching", lines });
  }
  if (input.unreadCount) sections.push({ id: "inbox", title: "Notifications", lines: [{ text: `${input.unreadCount} unread ${input.unreadCount === 1 ? "notification" : "notifications"}`, link: "notifications", tone: "info" }] });
  const headline = sections.length === 0 ? (range === "today" ? "Nothing scheduled today. Enjoy the day off." : "A quiet week. Good time for a backyard practice.") : actions ? `${actions} ${actions === 1 ? "thing needs" : "things need"} you${games.length ? ` and ${games.length} ${games.length === 1 ? "game" : "games"}` : ""} ${range === "today" ? "today" : "this week"}.` : `${games.length + practices.length} ${games.length + practices.length === 1 ? "event" : "events"} ${range === "today" ? "today" : "this week"}, nothing waiting on you.`;
  return { range, from, to, sections, headline, actionCount: actions };
}
export function digestToText(d: Digest, title: string): string { const lines = [`# ${title}`, `${d.range === "today" ? "Today" : "This week"} · ${fmtWhen(d.from)}${d.range === "week" ? ` to ${fmtWhen(d.to)}` : ""}`, "", d.headline, ""]; for (const s of d.sections) { lines.push(`## ${s.title}`); for (const l of s.lines) lines.push(`- ${l.when ? `${l.when}: ` : ""}${l.text}`); lines.push(""); } lines.push("Sent by GamePlanIQ. Manage topics in My Account → Notification preferences."); return lines.join("\n"); }
