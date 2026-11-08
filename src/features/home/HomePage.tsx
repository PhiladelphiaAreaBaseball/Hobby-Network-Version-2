import { Badge, Button, Card, Empty, LinkButton, Link, Notice, Page, PageHead, Progress, Ring, Section, Stat, StatusBadge, TeamMark, AGE_LABEL } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession, setActiveChild, useContent, lessonProgress } from "../../core/hooks";
import { navigate } from "../../core/router";
import { fmtTime, relativeDay, fmtDate } from "../../core/dates";
import { todayIso, plural, pct } from "../../core/util";
import { AdminDashboard } from "../admin/AdminDashboard";
import { Agenda } from "../../components/Calendar";
import { eventTitle, eventSubtitle } from "../schedule/eventText";
import { pitcherStatus } from "../../engines/pitchCount";
import { MyDutiesCard } from "../teams/TeamSignups";
import { ReportCardSummary } from "../reports/ReportCardPages";
import { nextGameFor } from "../gameday/GameDayPage";
import { CertificationStrip } from "../coaches/CertificationPages";
import { DigestCard } from "./DigestCard";
export function HomePage() {
  const ss = useSession(); const t = ss.tenant; if (!t) return null;
  if (ss.isStaff && !ss.isGuardian && !ss.isCoach) return <AdminDashboard />;
  if (ss.isPlayer) return <PlayerHome />;
  if (ss.role === "umpire") return <RoleHome kind="umpire" />;
  if (ss.role === "volunteer") return <RoleHome kind="volunteer" />;
  if (ss.isPlatform && !ss.isGuardian) return <AdminDashboard />;
  return <FamilyHome />;
}
function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }
function FamilyHome() {
  const ss = useSession(); const t = ss.tenant!; const content = useContent(); const today = todayIso();
  const child = ss.activeChild; const done = lessonProgress(t, child?.id ?? null);
  const familyTeamIds = new Set([...ss.children.map((c) => c.teamId).filter(Boolean), ...ss.coachTeams.map((x) => x.id)] as string[]);
  const events = t.events.filter((e) => e.teamIds.some((id) => familyTeamIds.has(id)) && e.start.slice(0, 10) >= today && e.status !== "cancelled").sort((a, b) => (a.start < b.start ? -1 : 1));
  const next = events[0]; const fieldsNotOpen = t.fields.filter((f) => f.status !== "open");
  const assignments = child ? t.assignments.filter((a) => a.playerIds.includes(child.id) && !a.completions[child.id]).sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1)) : [];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19);
  const weekPractices = child ? t.practicePlans.filter((p) => p.playerId === child.id && p.completedAt && p.completedAt >= weekAgo).length + t.completions.filter((c) => c.playerId === child.id && c.completedAt >= weekAgo).length : 0;
  const pinned = t.announcements.filter((a) => a.audience.scope === "league" || (a.audience.scope === "team" && familyTeamIds.has(a.audience.id ?? "")) || (a.audience.scope === "division" && ss.children.some((c) => c.divisionId === a.audience.id))).sort((a, b) => (a.pinned === b.pinned ? (a.publishedAt < b.publishedAt ? 1 : -1) : a.pinned ? -1 : 1)).slice(0, 3);
  const regSeason = t.seasons.find((x) => x.status === "registration"); const unregistered = regSeason ? ss.children.filter((c) => !t.registrations.some((r) => r.playerId === c.id && r.seasonId === regSeason.id && !["withdrawn", "refunded"].includes(r.status))) : [];
  const suggested = child ? content.lessons.filter((l) => l.ageGroups.includes(child.ageGroup) && !done.has(l.id)).slice(0, 3) : [];
  return <Page>
    <PageHead eyebrow={`${t.league.name} · ${t.activeSeason?.name}`} title={`${greeting()}, ${ss.user?.firstName ?? "there"}`} lede={ss.isCoach ? "Your family and your team, in one place." : "Here is what matters for your family today."} actions={ss.children.length > 1 ? <div className="chips" role="group" aria-label="Choose child">{ss.children.map((c) => <button key={c.id} type="button" className="chip" aria-pressed={child?.id === c.id} onClick={() => setActiveChild(c.id)}>{c.displayName} · {c.leagueAge}</button>)}</div> : undefined} />
    {fieldsNotOpen.length > 0 && <Notice kind="warn"><strong>Field status:</strong> {fieldsNotOpen.map((f) => `${f.name} is ${f.status.replace("_", " ")}${f.statusNote ? ` (${f.statusNote})` : ""}`).join("; ")}. <Link to="league" id="fields">See all fields</Link>.</Notice>}
    {unregistered.length > 0 && <Notice kind="info"><strong>{regSeason!.name} registration is open</strong> until {fmtDate(regSeason!.registrationCloses)}. {unregistered.map((c) => c.displayName).join(" and ")} {unregistered.length === 1 ? "is" : "are"} not registered yet. <Link to="register">Register now</Link>.</Notice>}
    {ss.isCoach && <CoachStrip />}
    <div className="two-col">
      <div className="col gap-4">
        <DigestCard />
        {child && <Card title={`Practice with ${child.displayName} in the next minute`} action={<Badge tone="grass">{AGE_LABEL[child.ageGroup]}</Badge>}>
          <div className="col gap-3">
            {assignments.length > 0 ? <div className="notice notice-info"><I.coach size={18} /><div className="grow"><strong>From {t.userName(assignments[0].assignedByUserId)}:</strong> {t.lessonById.get(assignments[0].lessonId)?.title}. {assignments[0].note}<div className="mt-2 flex gap-2 wrap"><Button variant="primary" size="sm" icon={<I.play size={14} />} onClick={() => navigate("lesson", assignments[0].lessonId)}>Start the lesson</Button><Button size="sm" onClick={() => navigate("practice", `lesson-${assignments[0].lessonId}`)}>10-minute practice</Button></div></div></div> : <p className="muted small">No coach assignments waiting. Pick a quick practice or a suggested lesson.</p>}
            <div className="flex gap-2 wrap"><Button variant="primary" icon={<I.lightning size={16} />} onClick={() => navigate("practice")}>Build a 10-minute practice</Button><Button icon={<I.parents size={16} />} onClick={() => navigate("parents")}>New to baseball? Start here</Button></div>
            {suggested.length > 0 && <div className="list">{suggested.map((l) => <button key={l.id} className="list-item clickable" style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate("lesson", l.id)}><I.academy size={18} className="faint" /><span className="grow col" style={{ minWidth: 0 }}><span className="list-item-title truncate">{l.title}</span><span className="list-item-sub">{l.category} · {l.durationMin} min · {l.equipmentFreeAlternative ? "no equipment option" : l.equipment.join(", ")}</span></span><I.chevronRight size={16} className="faint" /></button>)}</div>}
          </div></Card>}
        <Section title="Coming up" action={<Link to="schedule">Full schedule</Link>}>{next ? <Agenda events={events.slice(0, 6).map((e) => ({ event: e, title: eventTitle(e, t), subtitle: eventSubtitle(e, t) }))} onEvent={(e) => navigate("event", e.id)} limitDays={14} /> : <Empty icon={<I.calendar size={28} />} title="Nothing scheduled in the next two weeks" />}</Section>
      </div>
      <div className="col gap-4">
        {child && <Card title={`${child.displayName}'s week`} action={<Link to="player" id={child.id}>Dashboard</Link>}><div className="flex items-center gap-4"><Ring value={Math.min(weekPractices, child.weeklyPracticeGoal)} max={child.weeklyPracticeGoal} label="Weekly practice goal" tone="var(--grass)" /><div className="col gap-1"><strong>{weekPractices} of {child.weeklyPracticeGoal} practices this week</strong><span className="small muted">{done.size} lessons completed · {t.awards.filter((a) => a.playerId === child.id).length} badges</span><span className="small"><Link to="achievements">Challenges and achievements</Link></span></div></div></Card>}
        {child && <ReportCardSummary player={child} />}
        <MyDutiesCard />
        {ss.isCoach && <CertificationStrip />}
        {ss.children.map((c) => c.teamId && t.teamById.get(c.teamId)).filter(Boolean).map((team: any) => <Card key={team.id} onClick={() => navigate("team", team.id)}><div className="flex items-center gap-3"><TeamMark name={team.name} color={team.color} abbr={team.abbreviation} /><div className="grow col" style={{ minWidth: 0 }}><strong>{team.name}</strong><span className="small muted">{t.divisionById.get(team.divisionId)?.name} · Coach {t.userName(team.headCoachUserId)}</span></div><I.chevronRight className="faint" /></div></Card>)}
        <Card title="League news" action={<Link to="league">All news</Link>}>{pinned.length === 0 ? <p className="small muted">No announcements yet.</p> : <div className="list">{pinned.map((a) => <div key={a.id} className="list-item"><div className="grow col" style={{ minWidth: 0 }}><span className="list-item-title">{a.pinned && <I.pin size={12} style={{ display: "inline", marginRight: 4 }} />}{a.title}</span><span className="list-item-sub">{a.body.slice(0, 120)}{a.body.length > 120 ? "…" : ""}</span><span className="xsmall faint">{relativeDay(a.publishedAt)}</span></div></div>)}</div>}</Card>
      </div>
    </div>
  </Page>;
}
function CoachStrip() {
  const ss = useSession(); const t = ss.tenant!; const today = todayIso();
  return <div className="cards-2">{ss.coachTeams.map((team) => { const roster = t.players.filter((p) => p.teamId === team.id); const next = t.events.filter((e) => e.teamIds.includes(team.id) && e.start.slice(0, 10) >= today && e.status === "scheduled").sort((a, b) => (a.start < b.start ? -1 : 1))[0]; const asg = t.assignments.filter((a) => a.teamId === team.id).sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1))[0]; const asgPct = asg ? pct(Object.keys(asg.completions).length, asg.playerIds.length) : null; const pitchers = roster.filter((p) => p.positions.includes("P")); const resting = pitchers.filter((p) => !pitcherStatus(t.pitching.filter((x) => x.playerId === p.id), p.leagueAge, t.league.settings.pitchCount, today).eligibleToday).length;
    return <Card key={team.id} title={<span className="flex items-center gap-2"><TeamMark name={team.name} color={team.color} abbr={team.abbreviation} size={28} />{team.name} · coach view</span>} action={<Link to="coaches-team" id={team.id}>Team tools</Link>}><div className="col gap-2 small"><div><strong>Next:</strong> {next ? `${eventTitle(next, t)} · ${relativeDay(next.start)} ${fmtTime(next.start)}` : "nothing scheduled"}</div><div><strong>Roster:</strong> {plural(roster.length, "player")}{resting ? ` · ${resting} ${resting === 1 ? "pitcher" : "pitchers"} resting` : ""}</div>{asg && <div><strong>Home practice:</strong> {t.lessonById.get(asg.lessonId)?.title} · {asgPct}% complete<Progress value={asgPct ?? 0} tone="grass" /></div>}<div className="flex gap-2 wrap mt-2"><Button size="sm" variant="primary" icon={<I.coach size={14} />} onClick={() => navigate("coaches", "planner")}>Plan a practice</Button>{nextGameFor(t, team.id) && <Button size="sm" icon={<I.scoreboard size={14} />} onClick={() => navigate("gameday", nextGameFor(t, team.id)!.id)}>Game day</Button>}<Button size="sm" onClick={() => navigate("coaches-team", team.id)}>Assign home practice</Button></div></div></Card>; })}</div>;
}
function PlayerHome() {
  const ss = useSession(); const t = ss.tenant!; const content = useContent(); const p = ss.activeChild!; const done = lessonProgress(t, p.id); const team = p.teamId ? t.teamById.get(p.teamId) : undefined;
  const assignments = t.assignments.filter((a) => a.playerIds.includes(p.id) && !a.completions[p.id]); const awards = t.awards.filter((a) => a.playerId === p.id); const iq = t.iqProgress.find((x) => x.playerId === p.id); const correct = iq ? Object.values(iq.answers).filter((a) => a.correct).length : 0;
  const enrollment = t.enrollments.find((e) => e.playerId === p.id); const cur = enrollment ? t.curricula.find((c) => c.id === enrollment.curriculumId) : undefined; const nextWeek = cur?.weeks.find((w) => !enrollment!.completedWeeks.includes(w.week));
  return <Page>
    <PageHead eyebrow={team ? `${team.name} · ${t.divisionById.get(team.divisionId)?.name}` : t.league.name} title={`Hi ${p.displayName}!`} lede="Your own baseball dashboard. Learn something, practice something, earn a badge." />
    <div className="stats"><Stat label="Lessons done" value={done.size} hint="Keep going" tone="grass" onClick={() => navigate("academy")} /><Stat label="Badges" value={awards.length} hint={`${content.challenges.length - awards.length} more to earn`} tone="gold" onClick={() => navigate("achievements")} /><Stat label="Baseball IQ" value={correct} hint="questions right" tone="sky" onClick={() => navigate("iq")} /><Stat label="Weekly goal" value={`${p.weeklyPracticeGoal}x`} hint="practices a week" onClick={() => navigate("player", p.id)} /></div>
    <div className="two-col"><div className="col gap-4">
      <Card title="Your coach asked you to…" action={<Badge tone="clay">{assignments.length}</Badge>}>{assignments.length === 0 ? <p className="muted small">Nothing right now. Pick any lesson you like!</p> : <div className="list">{assignments.map((a) => { const l = t.lessonById.get(a.lessonId); return <button key={a.id} className="list-item clickable" style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate("lesson", a.lessonId)}><I.play size={20} style={{ color: "var(--grass)" }} /><span className="grow col" style={{ minWidth: 0 }}><span className="list-item-title">{l?.title}</span><span className="list-item-sub">{a.note}</span></span><I.chevronRight size={16} className="faint" /></button>; })}</div>}</Card>
      {cur && nextWeek && <Card title={`${cur.title} · week ${nextWeek.week}`} action={<Link to="curriculum" id={cur.id}>All weeks</Link>}><div className="col gap-2"><strong>{nextWeek.title}</strong><p className="small muted">{nextWeek.summary}</p><Progress value={enrollment!.completedWeeks.length} max={cur.weeksCount} tone="grass" /><div className="flex gap-2 wrap"><Button variant="primary" size="sm" onClick={() => navigate("lesson", nextWeek.lessonIds[0])}>Start this week</Button><Button size="sm" onClick={() => navigate("iq-quiz", `curriculum-${cur.id}-${nextWeek.week}`)}>Week quiz</Button></div></div></Card>}
    </div><div className="col gap-4">
      <Card title="Quick Baseball IQ"><p className="small muted">Five questions for your age. Tap where the ball should go.</p><div className="mt-3"><Button variant="primary" icon={<I.iq size={16} />} onClick={() => navigate("iq-quiz", "mixed")}>Play five questions</Button></div></Card>
      <Card title="Latest badges" action={<Link to="achievements">Gallery</Link>}>{awards.length === 0 ? <p className="small muted">Complete a lesson to earn your first badge.</p> : <div className="flex gap-2 wrap">{awards.slice(-6).map((a) => { const b = content.badges.find((x) => x.id === a.badgeId); return <Badge key={a.id} tone={b?.tier === "gold" ? "gold" : b?.tier === "silver" ? "sky" : "clay"}>{b?.name ?? a.badgeId}</Badge>; })}</div>}</Card>
    </div></div>
  </Page>;
}
function RoleHome({ kind }: { kind: "umpire" | "volunteer" }) {
  const ss = useSession(); const t = ss.tenant!; const today = todayIso();
  if (kind === "umpire") { const games = t.events.filter((e) => e.umpireUserIds.includes(ss.userId) && e.start.slice(0, 10) >= today).sort((a, b) => (a.start < b.start ? -1 : 1)); return <Page><PageHead eyebrow={t.league.name} title={`${greeting()}, ${ss.user?.firstName}`} lede="Your upcoming assignments and the rules resources umpires use most." actions={<LinkButton to="umpire">Availability and all assignments</LinkButton>} /><Section title="Upcoming assignments">{games.length ? <Agenda events={games.map((e) => ({ event: e, title: eventTitle(e, t), subtitle: eventSubtitle(e, t) }))} onEvent={(e) => navigate("event", e.id)} limitDays={30} /> : <Empty icon={<I.whistle size={28} />} title="No assignments yet" />}</Section><div className="cards-3"><Card onClick={() => navigate("resources", "rules")}><strong>Rules resources</strong><p className="small muted">Where to find the current rulebook and local ground rules.</p></Card><Card onClick={() => navigate("iq-lesson", "iq-15")}><strong>Umpire signals</strong><p className="small muted">Review the signals lesson in Baseball IQ.</p></Card><Card onClick={() => navigate("league", "fields")}><strong>Field status</strong><p className="small muted">Today's field decisions.</p></Card></div></Page>; }
  const mine = t.shifts.filter((sh) => !sh.teamId && sh.assignedUserIds.includes(ss.userId) && sh.start.slice(0, 10) >= today).sort((a, b) => (a.start < b.start ? -1 : 1)); const open = t.shifts.filter((sh) => !sh.teamId && sh.start.slice(0, 10) >= today && sh.assignedUserIds.length < sh.slots).length; const v = t.volunteers.find((x) => x.userId === ss.userId);
  return <Page><PageHead eyebrow={t.league.name} title={`${greeting()}, ${ss.user?.firstName}`} lede="Thank you for volunteering. Here are your shifts and what the league still needs." actions={<LinkButton to="volunteer" variant="primary">Sign up for a shift</LinkButton>} /><div className="stats"><Stat label="Your upcoming shifts" value={mine.length} onClick={() => navigate("volunteer")} /><Stat label="Open shifts" value={open} hint="league-wide" tone={open ? "gold" : undefined} onClick={() => navigate("volunteer")} /><Stat label="Background check" value={<StatusBadge status={v?.backgroundCheck.status ?? "not_started"} />} hint={v?.backgroundCheck.expiresAt ? `through ${fmtDate(v.backgroundCheck.expiresAt)}` : "handled by the league's screening provider"} /></div><Section title="Your shifts">{mine.length ? <div className="list">{mine.map((sh) => <div key={sh.id} className="list-item"><I.clock size={18} className="faint" /><div className="grow col"><span className="list-item-title">{sh.title}</span><span className="list-item-sub">{relativeDay(sh.start)} · {fmtTime(sh.start)}–{fmtTime(sh.end)}{sh.fieldId ? ` · ${t.fieldById.get(sh.fieldId)?.name}` : ""}</span></div></div>)}</div> : <Empty icon={<I.shield size={28} />} title="No shifts yet" action={<LinkButton to="volunteer" size="sm">See open shifts</LinkButton>} />}</Section></Page>;
}
