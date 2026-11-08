import { useState } from "react";
import { Badge, Button, Card, Check, Empty, Field, Input, Modal, Notice, Select, Textarea } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession } from "../../core/hooks";
import { navigate } from "../../core/router";
import { actions, run } from "../../core/actions";
import { fmtDate, fmtTime, relativeDay } from "../../core/dates";
import { todayIso, plural } from "../../core/util";
import type { Team, VolunteerShift } from "../../core/types";
import type { Tenant } from "../../core/select";

export const DUTY_KINDS: { id: VolunteerShift["kind"]; label: string; hint: string; slots: number }[] = [
  { id: "snack", label: "Post-game snacks", hint: "Bring a snack and drink for the team", slots: 1 },
  { id: "scorekeeper", label: "Scorekeeper", hint: "Keep the book in the app; the coach shows you once", slots: 1 },
  { id: "pitch_count", label: "Pitch counter", hint: "Click the counter for our pitcher", slots: 1 },
  { id: "dugout", label: "Dugout parent", hint: "Helmets on, batting order, water", slots: 2 },
  { id: "field_prep", label: "Field prep", hint: "Arrive 30 minutes early to rake and line", slots: 2 },
  { id: "other", label: "Team helper", hint: "Anything else the coach needs", slots: 1 },
];
export const KIND_LABEL: Record<string, string> = Object.fromEntries(DUTY_KINDS.map((k) => [k.id, k.label]));
export function teamShifts(t: Tenant, teamId: string) { const today = todayIso(); return t.shifts.filter((s) => s.teamId === teamId && s.end.slice(0, 10) >= today).sort((a, b) => (a.start < b.start ? -1 : 1)); }
export function myTeamDuties(t: Tenant, userId: string) { const today = todayIso(); return t.shifts.filter((s) => s.teamId && s.assignedUserIds.includes(userId) && s.end.slice(0, 10) >= today).sort((a, b) => (a.start < b.start ? -1 : 1)); }

export function TeamSignupsTab({ team }: { team: Team }) {
  const ss = useSession(); const t = ss.tenant!; const coachOf = ss.can("team.manage", { teamId: team.id }); const today = todayIso(); const shifts = teamShifts(t, team.id); const [add, setAdd] = useState<string | null>(null);
  const games = t.events.filter((e) => e.type === "game" && e.teamIds.includes(team.id) && e.start.slice(0, 10) >= today && e.status !== "cancelled").sort((a, b) => (a.start < b.start ? -1 : 1)).slice(0, 10);
  const byEvent = new Map<string, VolunteerShift[]>(); const loose: VolunteerShift[] = []; for (const s of shifts) { if (s.eventId) (byEvent.get(s.eventId) ?? byEvent.set(s.eventId, []).get(s.eventId)!).push(s); else loose.push(s); }
  const open = shifts.reduce((a, s) => a + Math.max(0, s.slots - s.assignedUserIds.length), 0); const mine = shifts.filter((s) => s.assignedUserIds.includes(ss.userId)).length;
  const onTeam = coachOf || ss.children.some((c) => c.teamId === team.id);
  return <div className="col gap-3">
    <div className="flex items-center gap-3 wrap"><Badge tone={open ? "gold" : "grass"}>{open} open {open === 1 ? "slot" : "slots"}</Badge><Badge>{mine} yours</Badge><span className="small muted grow">Snack, scorekeeper, pitch counter, dugout parent and field prep for each game. Tap to claim; tap again to release. Nobody else sees who has not signed up.</span>{coachOf && <Button size="sm" icon={<I.megaphone size={14} />} onClick={() => run(() => actions.remindTeamSignups(team.id), "Families were asked to fill the open slots.")} disabled={open === 0}>Ask families to fill {open}</Button>}</div>
    {!onTeam && !ss.isStaff && <Notice kind="info">Sign-ups are for this team's families. You can see the schedule but not claim a slot.</Notice>}
    {games.length === 0 && loose.length === 0 && <Empty icon={<I.calendar size={28} />} title="No upcoming games" body="Game-day duties appear once games are on the schedule." />}
    {games.map((g) => { const list = byEvent.get(g.id) ?? []; const home = g.homeTeamId === team.id; return <Card key={g.id} title={<span>{relativeDay(g.start)} · {fmtTime(g.start)} · {home ? "vs" : "at"} {t.teamName(home ? g.awayTeamId : g.homeTeamId)}</span>} action={<span className="flex items-center gap-2"><span className="xsmall muted">{g.fieldId ? t.fieldById.get(g.fieldId)?.name : "Field TBA"}</span>{coachOf && <Button size="sm" variant="ghost" icon={<I.plus size={14} />} onClick={() => setAdd(g.id)}>Add duty</Button>}</span>}>{list.length === 0 ? <div className="flex items-center gap-2 wrap"><span className="small muted">No duties posted for this game.</span>{coachOf && <Button size="sm" variant="primary" onClick={() => run(() => actions.createGameDuties(team.id, g.id, ["snack", "scorekeeper", "dugout"]), "Standard duties added: snacks, scorekeeper, dugout parent.")}>Add the standard three</Button>}</div> : <div className="list">{list.map((s) => <ShiftRow key={s.id} s={s} canClaim={onTeam} coachOf={coachOf} team={team} />)}</div>}</Card>; })}
    {loose.length > 0 && <Card title="Other team duties"><div className="list">{loose.map((s) => <ShiftRow key={s.id} s={s} canClaim={onTeam} coachOf={coachOf} team={team} />)}</div></Card>}
    {add && <AddDutyModal team={team} eventId={add} onClose={() => setAdd(null)} />}
  </div>;
}
function ShiftRow({ s, canClaim, coachOf, team }: { s: VolunteerShift; canClaim: boolean; coachOf: boolean; team: Team }) {
  const ss = useSession(); const t = ss.tenant!; const mine = s.assignedUserIds.includes(ss.userId); const full = s.assignedUserIds.length >= s.slots; const families = [...new Set(t.players.filter((p) => p.teamId === team.id).flatMap((p) => p.guardianUserIds))];
  return <div className="list-item"><span className={`duty-icon ${s.kind}`} aria-hidden="true">{s.kind === "snack" ? "🍊" : s.kind === "scorekeeper" ? "📓" : s.kind === "pitch_count" ? "🔢" : s.kind === "dugout" ? "🧢" : s.kind === "field_prep" ? "🧹" : "🙋"}</span><div className="grow col" style={{ minWidth: 0 }}><span className="list-item-title">{s.title}{s.note ? <span className="muted small"> · {s.note}</span> : ""}</span><span className="list-item-sub">{s.assignedUserIds.length === 0 ? "Nobody yet" : s.assignedUserIds.map((u) => (u === ss.userId ? "You" : t.userName(u).split(" ")[0] + " " + (t.userName(u).split(" ")[1]?.[0] ?? "") + ".")).join(", ")} · {s.assignedUserIds.length}/{s.slots}</span></div>
    {mine && (s.kind === "scorekeeper" || s.kind === "pitch_count") && s.eventId && <Button size="sm" icon={<I.scoreboard size={14} />} onClick={() => navigate("gameday", s.eventId)}>Open scorebook</Button>}
    {canClaim && (mine ? <Button size="sm" variant="success" icon={<I.check size={14} />} onClick={() => run(() => actions.signUpForShift(s.id), "Released. Thanks for checking.")}>You're on it</Button> : <Button size="sm" variant={full ? "default" : "primary"} disabled={full} onClick={() => run(() => actions.signUpForShift(s.id), "Signed up. A reminder comes the day before.")}>{full ? "Filled" : "I'll do it"}</Button>)}
    {coachOf && <Select aria-label={`Assign ${s.title}`} value="" onChange={(e) => e.target.value && run(() => actions.signUpForShift(s.id, e.target.value), "Assigned.")} style={{ maxWidth: 150 }}><option value="">Assign…</option>{families.filter((u) => !s.assignedUserIds.includes(u)).map((u) => <option key={u} value={u}>{t.userName(u)}</option>)}</Select>}
    {coachOf && <Button size="sm" variant="ghost" aria-label="Remove duty" onClick={() => run(() => actions.deleteShift(s.id), "Removed.")}><I.trash size={14} /></Button>}</div>;
}
function AddDutyModal({ team, eventId, onClose }: { team: Team; eventId: string; onClose: () => void }) {
  const [kind, setKind] = useState<VolunteerShift["kind"]>("snack"); const meta = DUTY_KINDS.find((k) => k.id === kind)!; const [title, setTitle] = useState(meta.label); const [slots, setSlots] = useState(meta.slots); const [note, setNote] = useState(""); const [useLabel, setUseLabel] = useState(true);
  return <Modal title="Add a game-day duty" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={async () => { const ok = await run(() => actions.saveTeamShift({ teamId: team.id, eventId, kind, title: useLabel ? meta.label : title, slots, note }), "Duty added."); if (ok) onClose(); }}>Add</Button></>}><div className="col gap-3"><Field label="Duty">{(id) => <Select id={id} value={kind} onChange={(e) => { const k = e.target.value as VolunteerShift["kind"]; setKind(k); const m = DUTY_KINDS.find((x) => x.id === k)!; setTitle(m.label); setSlots(m.slots); }}>{DUTY_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label} · {k.hint}</option>)}</Select>}</Field><Check label="Use the standard title" checked={useLabel} onChange={setUseLabel} />{!useLabel && <Field label="Title">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>}<Field label="How many families">{(id) => <Input id={id} type="number" min={1} max={12} value={slots} onChange={(e) => setSlots(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />}</Field><Field label="Note (optional)">{(id) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nut-free please. Team has 12 players." />}</Field></div></Modal>;
}
/** Home-page strip: upcoming duties this family has claimed. */
export function MyDutiesCard() {
  const ss = useSession(); const t = ss.tenant!; const mine = myTeamDuties(t, ss.userId).slice(0, 4); const openForMyTeams = ss.children.map((c) => c.teamId).filter(Boolean).flatMap((tid) => teamShifts(t, tid!)).filter((s) => s.assignedUserIds.length < s.slots).length;
  if (mine.length === 0 && openForMyTeams === 0) return null;
  return <Card title="Your team duties" action={mine.length === 0 ? <Badge tone="gold">{openForMyTeams} open</Badge> : undefined}>{mine.length === 0 ? <div className="small"><p className="muted">Your team has {plural(openForMyTeams, "open game-day slot")}: snacks, scorekeeping, dugout help. Two minutes to claim one.</p><div className="mt-2"><Button size="sm" variant="primary" onClick={() => navigate("team", ss.children.find((c) => c.teamId)?.teamId)}>See sign-ups</Button></div></div> : <div className="list">{mine.map((s) => <button key={s.id} className="list-item clickable" style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate((s.kind === "scorekeeper" || s.kind === "pitch_count") && s.eventId ? "gameday" : "team", (s.kind === "scorekeeper" || s.kind === "pitch_count") && s.eventId ? s.eventId : s.teamId)}><I.check size={18} style={{ color: "var(--grass)" }} /><span className="grow col" style={{ minWidth: 0 }}><span className="list-item-title">{s.title}</span><span className="list-item-sub">{t.teamName(s.teamId)} · {relativeDay(s.start)} {fmtTime(s.start)}{s.fieldId ? ` · ${t.fieldById.get(s.fieldId)?.name}` : ""}{(s.kind === "scorekeeper" || s.kind === "pitch_count") ? " · tap to open the scorebook" : ""}</span></span><I.chevronRight size={16} className="faint" /></button>)}</div>}</Card>;
}
