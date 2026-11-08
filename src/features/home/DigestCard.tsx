import { useMemo, useState } from "react";
import { Badge, Button, Card, Seg } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession, useContent } from "../../core/hooks";
import { navigate } from "../../core/router";
import { resolveLink } from "../../engines/notify";
import { familyCalendar, DEFAULT_CAL_OPTIONS } from "../../engines/familyCalendar";
import { buildDigest, digestToText, type DigestRange } from "../../engines/digest";
import { nextGameFor } from "../gameday/GameDayPage";
import { teamShifts } from "../teams/TeamSignups";
import { eventTitle } from "../schedule/eventText";
import { ExportModal } from "../practice/PracticePages";
import { todayIso } from "../../core/util";
import { fmtDate } from "../../core/dates";

/** "Today" and "This week" for the signed-in family or coach, built from the calendar feed, duties, report cards and coaching to-dos. */
export function DigestCard({ compact }: { compact?: boolean }) {
  const ss = useSession(); const t = ss.tenant!; const content = useContent(); const today = todayIso(); const [range, setRange] = useState<DigestRange>(ss.user?.notificationPrefs?.digest === "weekly" ? "week" : "today"); const [exportOpen, setExportOpen] = useState(false);
  const digest = useMemo(() => {
    const items = familyCalendar({ userId: ss.userId, children: ss.children, teams: t.teams, coachTeamIds: ss.coachTeams.map((x) => x.id), events: t.events, shifts: t.shifts, assignments: t.assignments, seasons: t.seasons, tryouts: t.tryouts, certifications: t.certifications, eventTitle: (e) => eventTitle(e, t), fieldName: (id) => (id ? t.fieldById.get(id)?.name ?? "" : ""), teamName: (id) => t.teamName(id), isEvaluator: t.tryouts.some((x) => x.evaluatorUserIds.includes(ss.userId)), moduleTitle: (id) => content.certModules.find((m) => m.id === id)?.title ?? id, fromDate: today }, DEFAULT_CAL_OPTIONS);
    const nextGames = ss.coachTeams.map((team) => { const event = nextGameFor(t, team.id); if (!event) return null; const sheet = t.gameSheets.find((g) => g.eventId === event.id); return { team, event, hasLineup: !!sheet?.lineups[team.id], openDuties: teamShifts(t, team.id).filter((s) => s.eventId === event.id).reduce((a, s) => a + Math.max(0, s.slots - s.assignedUserIds.length), 0) }; }).filter(Boolean) as any[];
    const cardsToWrite = ss.coachTeams.map((team) => ({ team, count: t.players.filter((p) => p.teamId === team.id && !t.reportCards.some((c) => c.playerId === p.id && c.teamId === team.id && c.seasonId === t.activeSeason?.id)).length }));
    return buildDigest({ today, items, notifications: t.notifications.filter((n) => n.userId === ss.userId), unreadCount: t.notifications.filter((n) => n.userId === ss.userId && !n.read).length, fieldsNotOpen: t.fields.filter((f) => f.status !== "open").map((f) => ({ name: f.name, status: f.status, note: f.statusNote })), reportCards: t.reportCards.filter((c) => ss.children.some((k) => k.id === c.playerId)), coachTeams: ss.coachTeams, nextGames, cardsToWrite, drafts: t.drafts.filter((d) => d.status === "live" && d.teamOrder.some((tid) => ss.coachTeams.some((x) => x.id === tid))), tryouts: t.tryouts, userId: ss.userId, isCoach: ss.isCoach, childrenNames: ss.children.map((c) => c.displayName) }, range);
  }, [ss.userId, ss.children, ss.coachTeams, t, range, today]);
  const title = `${range === "today" ? "Today" : "This week"} for the ${ss.user?.lastName ?? ""} family`;
  return <Card title={<span className="flex items-center gap-2"><I.sparkle size={18} />{range === "today" ? "Today" : "This week"}</span>} action={<Seg label="Digest range" options={[{ id: "today", label: "Today" }, { id: "week", label: "Week" }]} value={range} onChange={setRange} />}>
    <div className="col gap-3"><p className={compact ? "small" : ""} style={{ fontWeight: 600 }}>{digest.headline}</p>
      {digest.sections.map((s) => <div key={s.id} className="col gap-1"><span className="eyebrow">{s.title}</span><div className="list">{s.lines.slice(0, compact ? 3 : 8).map((l, i) => <button key={i} className="list-item clickable digest-line" style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit", padding: ".35rem .5rem" }} onClick={() => { if (!l.link) return; const r = resolveLink(l.link); navigate(r.name, r.id); }}><span className={`digest-dot ${l.tone ?? "info"}`} aria-hidden="true" /><span className="grow col" style={{ minWidth: 0 }}><span className="small">{l.text}</span>{l.when && <span className="xsmall muted">{l.when}</span>}</span>{l.link && <I.chevronRight size={14} className="faint" />}</button>)}{s.lines.length > (compact ? 3 : 8) && <span className="xsmall muted" style={{ padding: ".25rem .5rem" }}>and {s.lines.length - (compact ? 3 : 8)} more</span>}</div></div>)}
      <div className="flex gap-2 wrap items-center"><Button size="sm" icon={<I.copy size={14} />} onClick={() => setExportOpen(true)}>Copy / email this</Button><Badge>{digest.actionCount} to do</Badge><span className="xsmall muted">{fmtDate(digest.from)}{range === "week" ? ` – ${fmtDate(digest.to)}` : ""} · delivery set to {ss.user?.notificationPrefs?.digest ?? "immediate"}</span></div></div>
    {exportOpen && <ExportModal text={digestToText(digest, title)} onClose={() => setExportOpen(false)} />}
  </Card>;
}
