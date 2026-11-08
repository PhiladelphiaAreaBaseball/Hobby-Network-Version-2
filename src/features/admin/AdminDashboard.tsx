import { Badge, Button, Card, Empty, LinkButton, Link, Notice, Page, PageHead, Section, Stat, StatusBadge } from "../../components/ui";
import { I } from "../../components/icons";
import { useTenant } from "../../core/select";
import { useAppStore, currentMemberships } from "../../core/store";
import { navigate } from "../../core/router";
import { visibleAdminNav } from "../../app/nav";
import { findConflicts } from "../../engines/scheduling";
import { fmtDate, fmtTime, relativeDay } from "../../core/dates";
import { money, pct, todayIso } from "../../core/util";
export function AdminDashboard() {
  const t = useTenant(); const s = useAppStore(); const memberships = currentMemberships(s); if (!t) return null;
  const nav = visibleAdminNav(memberships, t.leagueId); const today = todayIso(); const season = t.activeSeason;
  const rostered = t.players.filter((p) => p.teamId).length; const regSeason = t.seasons.find((x) => x.status === "registration");
  const upcomingGames = t.events.filter((e) => e.type === "game" && e.status === "scheduled" && e.start.slice(0, 10) >= today).sort((a, b) => (a.start < b.start ? -1 : 1));
  const pendingBalance = t.registrations.filter((r) => !["withdrawn", "refunded", "draft"].includes(r.status)).reduce((a, r) => a + Math.max(0, r.balance), 0);
  const pendingCount = t.registrations.filter((r) => r.balance > 0 && !["withdrawn", "refunded", "draft"].includes(r.status)).length;
  const upcomingShifts = t.shifts.filter((sh) => sh.start.slice(0, 10) >= today); const slots = upcomingShifts.reduce((a, sh) => a + sh.slots, 0); const filled = upcomingShifts.reduce((a, sh) => a + Math.min(sh.slots, sh.assignedUserIds.length), 0);
  const academyActive = new Set(t.completions.map((c) => c.playerId)).size;
  const conflicts = findConflicts(t.events.filter((e) => e.start.slice(0, 10) >= today), t.teams, (id) => t.teamName(id), (id) => t.fieldById.get(id)?.name ?? id, (id) => t.userName(id));
  const pendingDocs = t.registrations.filter((r) => r.status === "pending_documents" || r.documents.some((d) => d.status === "uploaded")).length;
  const waitlist = t.registrations.filter((r) => r.status === "waitlisted").length; const bgNeeded = t.volunteers.filter((v) => v.backgroundCheck.status !== "cleared").length;
  const recent = [...t.announcements].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).slice(0, 4);
  const has = (id: string) => nav.some((n) => n.id === id);
  const tasks = [
    has("admin-registrations") && pendingDocs > 0 && { label: `${pendingDocs} registrations waiting on document review`, route: "admin-registrations" },
    has("admin-registrations") && waitlist > 0 && { label: `${waitlist} players on the waitlist for ${regSeason?.name ?? "next season"}`, route: "admin-registrations" },
    has("admin-schedule") && conflicts.length > 0 && { label: `${conflicts.length} scheduling conflicts to resolve`, route: "admin-schedule" },
    has("admin-volunteers") && bgNeeded > 0 && { label: `${bgNeeded} volunteers without a cleared background check`, route: "admin-volunteers" },
    has("admin-fields") && t.fields.some((f) => f.status !== "open") && { label: `Field status needs a decision: ${t.fields.filter((f) => f.status !== "open").map((f) => f.name).join(", ")}`, route: "admin-fields" },
    has("admin-finance") && pendingCount > 0 && { label: `${pendingCount} registrations with an outstanding balance (${money(pendingBalance)})`, route: "admin-finance" },
  ].filter(Boolean) as { label: string; route: string }[];
  return <Page>
    <PageHead eyebrow={`${t.league.name} · ${season?.name ?? ""}`} title="League administration" lede="Everything that needs a decision today, then the numbers behind it." actions={<>{has("admin-communications") && <LinkButton to="admin-communications" icon={<I.megaphone size={16} />}>Post announcement</LinkButton>}{has("admin-schedule") && <LinkButton to="admin-schedule" icon={<I.calendar size={16} />}>Scheduling</LinkButton>}</>} />
    {tasks.length > 0 ? <Card title="Needs attention" action={<Badge tone="gold">{tasks.length}</Badge>}><div className="list">{tasks.map((x) => <button key={x.label} className="list-item clickable" style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate(x.route)}><I.alert size={18} className="faint" /><span className="grow">{x.label}</span><I.chevronRight size={16} className="faint" /></button>)}</div></Card> : <Notice kind="success">Nothing is waiting on you. Enjoy the quiet.</Notice>}
    <div className="stats">
      <Stat label="Registered players" value={rostered} hint={`${t.players.length} in the league`} onClick={has("admin-players") ? () => navigate("admin-players") : undefined} />
      <Stat label="Active teams" value={t.teams.length} hint={`${t.divisions.length} divisions`} onClick={has("admin-teams") ? () => navigate("admin-teams") : undefined} />
      <Stat label="Upcoming games" value={upcomingGames.length} hint={upcomingGames[0] ? `Next: ${relativeDay(upcomingGames[0].start)} ${fmtTime(upcomingGames[0].start)}` : "None scheduled"} onClick={() => navigate("admin-schedule")} />
      <Stat label="Open registration" value={regSeason ? 1 : 0} hint={regSeason ? `${regSeason.name} closes ${fmtDate(regSeason.registrationCloses)}` : "No open periods"} onClick={has("admin-registrations") ? () => navigate("admin-registrations") : undefined} />
      <Stat label="Pending payments" value={money(pendingBalance)} hint={`${pendingCount} registrations`} tone={pendingBalance > 0 ? "gold" : undefined} onClick={has("admin-finance") ? () => navigate("admin-finance") : undefined} />
      <Stat label="Volunteer coverage" value={`${pct(filled, slots)}%`} hint={`${filled} of ${slots} upcoming shift slots`} tone={pct(filled, slots) < 60 ? "stitch" : "grass"} onClick={has("admin-volunteers") ? () => navigate("admin-volunteers") : undefined} />
      <Stat label="Academy participation" value={`${pct(academyActive, Math.max(1, rostered))}%`} hint={`${academyActive} players completed a lesson`} onClick={() => navigate("admin-reports")} />
    </div>
    <div className="two-col">
      <div className="col gap-4">
        <Card title="Field status" action={has("admin-fields") && <Link to="admin-fields">Update</Link>}><div className="list">{t.fields.map((f) => <div key={f.id} className="list-item"><I.field size={18} className="faint" /><div className="grow col" style={{ minWidth: 0 }}><span className="list-item-title">{f.name}</span>{f.statusNote && <span className="list-item-sub">{f.statusNote}</span>}</div><StatusBadge status={f.status} /></div>)}</div></Card>
        <Card title="Recent announcements" action={has("admin-communications") && <Link to="admin-communications">Manage</Link>}>{recent.length === 0 ? <Empty title="No announcements yet" /> : <div className="list">{recent.map((a) => <div key={a.id} className="list-item"><div className="grow col" style={{ minWidth: 0 }}><span className="list-item-title truncate">{a.title}</span><span className="list-item-sub">{fmtDate(a.publishedAt)} · {a.audience.scope}{a.pinned ? " · pinned" : ""}</span></div><Badge>{a.kind}</Badge></div>)}</div>}</Card>
      </div>
      <div className="col gap-4">
        {(has("admin-calculator")) && <Card title="Financial planning" action={<Badge tone="sky">New</Badge>}><p className="small muted">See how registration revenue can fund turf and other facility projects over time.</p><div className="mt-3"><Button variant="primary" icon={<I.target size={16} />} onClick={() => navigate("admin-calculator")}>Field Improvement Fund Calculator</Button></div></Card>}
        <Card title="Management"><div className="col gap-1">{nav.filter((n) => n.id !== "admin").map((n) => { const Icon = I[n.icon]; return <button key={n.id} className="list-item clickable" style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit", padding: ".5rem" }} onClick={() => navigate(n.route)}><Icon size={18} className="faint" /><span className="grow">{n.label}</span><I.chevronRight size={16} className="faint" /></button>; })}</div></Card>
      </div>
    </div>
  </Page>;
}
