import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, Input, Modal, Notice, Progress, Select } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession } from "../../core/hooks";
import { navigate } from "../../core/router";
import { actions, run } from "../../core/actions";
import { fmtDate } from "../../core/dates";
import { todayIso } from "../../core/util";
import { compliance } from "../../engines/curriculumCompliance";
import type { Team } from "../../core/types";

/** Coach view: which curriculum the team follows, the current week, and which weeks were actually run. */
export function CurriculumCard({ team }: { team: Team }) {
  const ss = useSession(); const t = ss.tenant!; const today = todayIso(); const tc = t.teamCurricula.find((x) => x.teamId === team.id && x.seasonId === team.seasonId); const cur = tc ? t.curricula.find((c) => c.id === tc.curriculumId) : undefined; const [edit, setEdit] = useState(false); const canEdit = ss.can("team.manage", { teamId: team.id }) || ss.can("league.content");
  const summary = useMemo(() => (tc && cur ? compliance(tc, cur, t.practicePlans, t.assignments, t.drills, today) : null), [tc, cur, t.practicePlans, t.assignments, t.drills, today]);
  return <Card title={<span className="flex items-center gap-2"><I.book size={18} />Season curriculum</span>} action={canEdit && <Button size="sm" onClick={() => setEdit(true)}>{tc ? "Change" : "Assign"}</Button>}>
    {!tc || !cur || !summary ? <p className="small muted">No curriculum assigned. Pick one of the league's programs and every week's practice plan and home assignment will count toward it.</p> : <div className="col gap-2 small">
      <div className="flex items-center gap-2 wrap"><strong>{cur.title}</strong><Badge>{cur.weeksCount} weeks</Badge><span className="muted">from {fmtDate(tc.startDate)}</span>{summary.currentWeek && <Badge tone="primary">Week {summary.currentWeek}</Badge>}</div>
      <div className="flex items-center gap-2"><span style={{ width: 160 }}><Progress value={summary.weeksCovered} max={Math.max(1, summary.weeksElapsed)} tone={summary.pct >= 75 ? "grass" : summary.pct >= 50 ? "gold" : "clay"} label="Weeks covered" /></span><span>{summary.weeksCovered} of {summary.weeksElapsed} elapsed weeks covered ({summary.pct}%)</span></div>
      <div className="week-grid">{summary.weeks.map((w) => <div key={w.week} className={`week-cell ${w.covered ? "covered" : w.elapsed ? "missed" : "future"} ${summary.currentWeek === w.week ? "now" : ""}`} title={`${w.title} · ${fmtDate(w.start)}${w.evidence.length ? ` · ${w.evidence.join("; ")}` : ""}`}><span className="week-num">{w.week}</span><span className="week-title">{w.title}</span></div>)}</div>
      {summary.currentWeek && (() => { const w = cur.weeks.find((x) => x.week === summary.currentWeek)!; return <div className="panel"><div className="eyebrow mb-1">This week · {w.title}</div><p style={{ margin: 0 }}>{w.focus}</p><div className="flex gap-2 wrap mt-2">{w.lessonIds.map((id) => t.lessonById.get(id)).filter(Boolean).map((l) => <button key={l!.id} className="chip" onClick={() => navigate("lesson", l!.id)}>{l!.title}</button>)}</div>{w.coachTip && <p className="xsmall muted mt-2" style={{ margin: ".5rem 0 0" }}>Coach tip: {w.coachTip}</p>}</div>; })()}
      <span className="xsmall muted">A week counts when a completed team practice or a home assignment in that week teaches one of its lessons. Advisory only.</span>
    </div>}
    {edit && <AssignCurriculumModal team={team} onClose={() => setEdit(false)} />}
  </Card>;
}
function AssignCurriculumModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const ss = useSession(); const t = ss.tenant!; const tc = t.teamCurricula.find((x) => x.teamId === team.id && x.seasonId === team.seasonId); const div = t.divisionById.get(team.divisionId); const options = t.curricula.filter((c) => (c.status ?? "published") === "published" && (!div || c.ageGroups.includes(div.ageGroup))); const [curId, setCurId] = useState(tc?.curriculumId ?? div?.curriculumId ?? options[0]?.id ?? ""); const [start, setStart] = useState(tc?.startDate ?? t.seasons.find((s) => s.id === team.seasonId)?.startDate ?? todayIso());
  return <Modal title={`Curriculum for the ${team.name}`} onClose={onClose} footer={<>{tc && <Button variant="ghost" onClick={async () => { const ok = await run(() => actions.assignTeamCurriculum(team.id, null, start), "Curriculum removed."); if (ok !== undefined) onClose(); }}>Remove</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!curId} onClick={async () => { const ok = await run(() => actions.assignTeamCurriculum(team.id, curId, start), "Curriculum assigned."); if (ok) onClose(); }}>Save</Button></>}>
    <div className="col gap-3"><Field label="Program">{(id) => <Select id={id} value={curId} onChange={(e) => setCurId(e.target.value)}>{options.map((c) => <option key={c.id} value={c.id}>{c.title} · {c.weeksCount} weeks</option>)}</Select>}</Field><Field label="Week 1 starts">{(id) => <Input id={id} type="date" value={start} onChange={(e) => setStart(e.target.value)} />}</Field>{options.find((c) => c.id === curId) && <Notice kind="info">{options.find((c) => c.id === curId)!.summary}</Notice>}</div></Modal>;
}
/** Board view for Academy content: every team, its curriculum and how many elapsed weeks it has covered. */
export function CurriculumComplianceTable() {
  const ss = useSession(); const t = ss.tenant!; const today = todayIso(); const rows = t.teams.filter((tm) => tm.seasonId === t.activeSeason?.id).map((tm) => { const tc = t.teamCurricula.find((x) => x.teamId === tm.id && x.seasonId === tm.seasonId); const cur = tc ? t.curricula.find((c) => c.id === tc.curriculumId) : undefined; const s = tc && cur ? compliance(tc, cur, t.practicePlans, t.assignments, t.drills, today) : null; return { tm, cur, s }; });
  const assigned = rows.filter((r) => r.s); const avg = assigned.length ? Math.round(assigned.reduce((a, r) => a + r.s!.pct, 0) / assigned.length) : 0;
  return <Card title="Curriculum follow-through by team" action={<span className="xsmall muted">{assigned.length} of {rows.length} teams assigned · average {avg}% of elapsed weeks covered</span>}>
    <div className="table-wrap"><table className="table"><thead><tr><th>Team</th><th>Division</th><th>Curriculum</th><th>Week</th><th>Covered</th><th></th></tr></thead><tbody>{rows.map(({ tm, cur, s }) => <tr key={tm.id}><td>{tm.name}</td><td className="small">{t.divisionById.get(tm.divisionId)?.name}</td><td className="small">{cur?.title ?? <span className="muted">none</span>}</td><td>{s?.currentWeek ?? "—"}</td><td>{s ? <span className="flex items-center gap-2"><span style={{ width: 90 }}><Progress value={s.weeksCovered} max={Math.max(1, s.weeksElapsed)} tone={s.pct >= 75 ? "grass" : s.pct >= 50 ? "gold" : "clay"} label="Covered" /></span><span className="small">{s.weeksCovered}/{s.weeksElapsed}</span></span> : <span className="muted small">—</span>}</td><td><Button size="sm" variant="ghost" onClick={() => navigate("coaches-team", tm.id)}>Team tools</Button></td></tr>)}</tbody></table></div>
    <p className="xsmall muted mt-2">Use this to offer help, not to grade coaches: a low number usually means rainouts or a plan built outside the app.</p>
  </Card>;
}
