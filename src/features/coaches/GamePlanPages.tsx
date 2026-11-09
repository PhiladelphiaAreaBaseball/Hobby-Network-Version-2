import { useMemo, useState } from "react";
import { Badge, Button, Card, Check, Empty, Field, Input, Modal, Notice, Page, PageHead, Select, Textarea } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession } from "../../core/hooks";
import { navigate } from "../../core/router";
import { actions, run, gamePlanShareTargets } from "../../core/actions";
import { capability } from "../../core/capabilities";
import { store } from "../../core/store";
import { fmtDate, fmtDateTime, fmtTime, relativeDay } from "../../core/dates";
import { todayIso, plural } from "../../core/util";
import { pitcherStatus } from "../../engines/pitchCount";
import { DEFAULT_PLAY_RULES } from "../../engines/gameDay";
import { PLAN_COLUMNS, copyRow, emptyRows, planIssues, playerLines, type PlanRow } from "../../engines/gamePlan";
import { SimplePdf } from "../../engines/pdf";
import type { Tenant } from "../../core/select";
import type { GamePlan, Player, Team } from "../../core/types";

const isHeadCoachOf = (ss: ReturnType<typeof useSession>, teamId: string) => ss.memberships.some((m) => m.role === "head_coach" && (m.teamIds ?? []).includes(teamId));
const gameLabel = (t: Tenant, teamId: string, eventId?: string) => { const e = eventId ? t.eventById.get(eventId) : undefined; if (!e) return "No game linked"; const opp = e.homeTeamId === teamId ? e.awayTeamId : e.homeTeamId; return `${e.homeTeamId === teamId ? "vs" : "at"} ${t.teamName(opp)} · ${relativeDay(e.start)} ${fmtTime(e.start)}`; };

/** Team tools tab: the head coach's plans, plus any plan shared with the viewer. */
export function GamePlansTab({ team }: { team: Team }) {
  const ss = useSession(); const t = ss.tenant!; const head = isHeadCoachOf(ss, team.id); const plans = t.gamePlans.filter((g) => g.teamId === team.id).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)); const [open, setOpen] = useState(false);
  return <div className="col gap-3">
    <Notice kind="info">{head ? "Plan where every player goes, inning by inning, before game day. Plans are private to you: nobody else, including the league, sees them unless you share one." : "Game plans are private to the head coach. You see the ones the head coach shared with you, read-only."}</Notice>
    {head && <div><Button variant="primary" icon={<I.plus size={16} />} onClick={() => setOpen(true)}>New game plan</Button></div>}
    {plans.length === 0 ? <Empty icon={<I.clipboard size={28} />} title={head ? "No game plans yet" : "Nothing shared with you"} body={head ? "Pick an upcoming game and fill in the grid: 3B, SS, 2B, 1B, LF, CF, RF, C, Pitcher, Relief and two roster spots for each inning." : undefined} /> : <div className="list">{plans.map((g) => <button key={g.id} className="list-item clickable" style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate("gameplan", g.id)}><I.clipboard size={18} className="faint" /><span className="grow col" style={{ minWidth: 0 }}><span className="list-item-title">{g.title}</span><span className="list-item-sub">{gameLabel(t, team.id, g.eventId)} · updated {fmtDateTime(g.updatedAt)}</span></span>{g.ownerUserId === ss.userId ? (g.sharedWithUserIds.length ? <Badge tone="sky">Shared with {g.sharedWithUserIds.length}</Badge> : <Badge><I.lock size={12} /> Private</Badge>) : <Badge>Shared by {t.userName(g.ownerUserId)}</Badge>}<I.chevronRight size={16} className="faint" /></button>)}</div>}
    {open && <NewPlanModal team={team} onClose={() => setOpen(false)} />}
  </div>;
}
function NewPlanModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const ss = useSession(); const t = ss.tenant!; const now = new Date().toISOString().slice(0, 16); const games = t.events.filter((e) => e.type === "game" && e.status === "scheduled" && e.teamIds.includes(team.id) && e.start >= now).sort((a, b) => (a.start < b.start ? -1 : 1)); const taken = new Set(t.gamePlans.filter((g) => g.teamId === team.id).map((g) => g.eventId));
  const [eventId, setEventId] = useState(games.find((g) => !taken.has(g.id))?.id ?? games[0]?.id ?? ""); const [title, setTitle] = useState("");
  const auto = eventId ? `Game plan ${gameLabel(t, team.id, eventId).split(" · ")[0]}` : "Game plan";
  return <Modal title="New game plan" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={async () => { const g = await run(() => actions.createGamePlan(team.id, { eventId: eventId || undefined, title: title || auto })); if (g) { onClose(); navigate("gameplan", g.id); } }}>Create</Button></>}>
    <div className="col gap-3"><Field label="Game">{(id) => <Select id={id} value={eventId} onChange={(e) => setEventId(e.target.value)}><option value="">No game yet (practice a plan)</option>{games.map((g) => <option key={g.id} value={g.id}>{gameLabel(t, team.id, g.id)}{taken.has(g.id) ? " · has a plan" : ""}</option>)}</Select>}</Field><Field label="Name">{(id) => <Input id={id} value={title} placeholder={auto} onChange={(e) => setTitle(e.target.value)} />}</Field><p className="small muted" style={{ margin: 0 }}>Only you can see this plan until you share it.</p></div></Modal>;
}
/** The grid itself. The owner edits; people it was shared with read it. Everyone else gets a privacy notice. */
export function GamePlanPage({ id }: { id: string }) {
  const ss = useSession(); const t = ss.tenant!; const gp = t.gamePlans.find((g) => g.id === id);
  if (!gp) return <Page narrow><PageHead title="Game plan" crumbs={[{ label: "Coaches' HQ", to: "coaches" }]} /><Notice kind="warn">This game plan is private to the head coach who made it. If it was shared with you, sign in as that person.</Notice></Page>;
  return <GamePlanEditor key={gp.id + gp.updatedAt} gp={gp} />;
}
function GamePlanEditor({ gp }: { gp: GamePlan }) {
  const ss = useSession(); const t = ss.tenant!; const team = t.teamById.get(gp.teamId)!; const owner = gp.ownerUserId === ss.userId; const roster = useMemo(() => t.players.filter((p) => p.teamId === gp.teamId).sort((a, b) => (a.jerseyNumber ?? 99) - (b.jerseyNumber ?? 99) || a.displayName.localeCompare(b.displayName)), [t.players, gp.teamId]);
  const [rows, setRows] = useState<PlanRow[]>(() => (gp.innings?.length ? gp.innings.map((r) => ({ ...emptyRows(1)[0], ...r })) : emptyRows())); const [notes, setNotes] = useState(gp.notes ?? ""); const [title, setTitle] = useState(gp.title); const [share, setShare] = useState(false); const [busy, setBusy] = useState(false);
  const norm = (rs: PlanRow[]) => JSON.stringify(rs.map((r) => PLAN_COLUMNS.map((c) => r[c.key] ?? ""))); const dirty = norm(rows) !== norm(gp.innings ?? []) || notes !== (gp.notes ?? "") || title !== gp.title;
  const ev = gp.eventId ? t.eventById.get(gp.eventId) : undefined; const gameDay = ev ? ev.start.slice(0, 10) : todayIso(); const rules = team ? t.divisionById.get(team.divisionId)?.playRules ?? DEFAULT_PLAY_RULES : DEFAULT_PLAY_RULES;
  const pitcherOk = (pid: string) => { const p = t.playerById.get(pid); if (!p) return { ok: true, note: "" }; const st = pitcherStatus(t.pitching.filter((x) => x.playerId === pid && x.date < gameDay), p.leagueAge, t.league.settings.pitchCount, gameDay); return st.eligibleToday ? { ok: true, note: "" } : { ok: false, note: `is on required rest until ${fmtDate(st.nextEligible)}` }; };
  const issues = useMemo(() => planIssues(rows, roster, rules, pitcherOk), [rows, roster, rules]); const lines = useMemo(() => playerLines(rows, roster), [rows, roster]);
  const conflict = (i: number, key: string) => issues.some((x) => x.level === "error" && x.inning === i + 1 && x.key === key) || (rows[i][key] && issues.some((x) => x.level === "error" && x.inning === i + 1 && x.playerId === rows[i][key]));
  const set = (i: number, key: string, pid: string) => setRows(rows.map((r, k) => (k === i ? { ...r, [key]: pid } : r)));
  const nameOf = (pid: string) => t.playerById.get(pid)?.displayName ?? "";
  const save = async () => { setBusy(true); await run(() => actions.saveGamePlan(gp.id, { innings: rows, notes, title }), "Game plan saved."); setBusy(false); };
  const pdf = async () => { const bytes = buildPlanPdf(t, gp, rows, roster, title, notes); const name = `game-plan-${team.name.toLowerCase()}-${gameDay}.pdf`; const dl = capability().downloads; if (dl) { try { await dl.save({ filename: name, data: bytes, type: "application/pdf" }); store.toast("Dugout card saved.", "success"); return; } catch (e: any) { if (e?.code === "declined") return; } } try { const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" })); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch { store.toast("Download is not available in this viewer.", "error"); } };
  const errors = issues.filter((x) => x.level === "error"); const warns = issues.filter((x) => x.level === "warn"); const infos = issues.filter((x) => x.level === "info");
  return <Page><PageHead crumbs={[{ label: "Coaches' HQ", to: "coaches" }, { label: `${team.name} team tools`, to: "coaches-team", id: team.id }]} eyebrow={`${team.name} · ${gameLabel(t, team.id, gp.eventId)}`} title={owner ? <Input aria-label="Plan name" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: "1.4rem", fontFamily: "var(--font-display)", fontWeight: 700, maxWidth: 520 }} /> : gp.title}
    lede={owner ? (gp.sharedWithUserIds.length ? `Shared read-only with ${gp.sharedWithUserIds.map((u) => t.userName(u)).join(", ")}.` : "Private: only you can see this plan.") : `Shared with you by ${t.userName(gp.ownerUserId)}. Read-only.`}
    actions={<>{owner && <Button variant="primary" disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : dirty ? "Save" : "Saved"}</Button>}{owner && <Button icon={<I.teams size={16} />} onClick={() => setShare(true)}>Share</Button>}{owner && ev && <Button icon={<I.scoreboard size={16} />} onClick={async () => { if (dirty) await run(() => actions.saveGamePlan(gp.id, { innings: rows, notes, title })); const r = await run(() => actions.applyGamePlanToLineup(gp.id), "Sent to the game-day lineup card."); if (r) navigate("gameday", r); }}>Use on game day</Button>}<Button icon={<I.download size={16} />} onClick={pdf}>Dugout card</Button>{owner && <Button variant="ghost" aria-label="Delete plan" onClick={async () => { const ok = await run(() => actions.deleteGamePlan(gp.id), "Deleted."); if (ok !== undefined) navigate("coaches-team", team.id); }}><I.trash size={16} /></Button>}</>} />
    <div className="gp-legend small muted"><Badge><I.lock size={12} /> {owner ? (gp.sharedWithUserIds.length ? `Shared with ${gp.sharedWithUserIds.length}` : "Private") : "Read-only"}</Badge><span>{plural(roster.length, "player")} on the roster · {PLAN_COLUMNS.length} spots per inning · Relief and Roster are off the field</span>{errors.length > 0 && <Badge tone="stitch">{plural(errors.length, "conflict")}</Badge>}{warns.length > 0 && <Badge tone="gold">{plural(warns.length, "warning")}</Badge>}</div>
    <div className="table-wrap gp-wrap"><table className="table gp-grid"><thead><tr><th className="gp-inning">Inning</th>{PLAN_COLUMNS.map((c, k) => <th key={c.key + k} title={c.hint} className={c.field ? "" : "gp-off"}>{c.label}</th>)}{owner && <th></th>}</tr></thead>
      <tbody>{rows.map((row, i) => <tr key={i}><td className="gp-inning"><strong>{i + 1}</strong></td>{PLAN_COLUMNS.map((c, k) => { const v = row[c.key]; const bad = conflict(i, c.key); return <td key={c.key + k} className={`${c.field ? "" : "gp-off"} ${bad ? "gp-bad" : ""}`}>{owner ? <select className="gp-cell" aria-label={`Inning ${i + 1} ${c.label}${c.key === "R1" ? " 1" : c.key === "R2" ? " 2" : ""}`} value={v} onChange={(e) => set(i, c.key, e.target.value)}><option value="">—</option>{roster.map((p) => { const where = PLAN_COLUMNS.find((x) => x.key !== c.key && row[x.key] === p.id); return <option key={p.id} value={p.id}>{p.jerseyNumber ? `#${p.jerseyNumber} ` : ""}{p.displayName}{where ? ` (${where.label})` : ""}</option>; })}</select> : <span className="gp-name">{nameOf(v) || "—"}</span>}</td>; })}{owner && <td>{i > 0 && <button className="link-btn xsmall" onClick={() => setRows(copyRow(rows, i - 1, i))} title="Copy the inning above">copy ↑</button>}</td>}</tr>)}</tbody></table></div>
    {owner && <div className="flex gap-2 wrap"><Button size="sm" variant="ghost" onClick={() => setRows(emptyRows())}>Clear all</Button>{dirty && <span className="small muted" style={{ alignSelf: "center" }}>Unsaved changes</span>}</div>}
    <div className="two-col">
      <Card title="Checks">{issues.length === 0 ? <p className="small muted">No conflicts. Every spot is filled and every player is placed.</p> : <div className="col gap-2 small">{[...errors, ...warns, ...infos].map((x, k) => <div key={k} className="flex gap-2 items-start">{x.level === "error" ? <I.alert size={16} style={{ color: "var(--stitch)", flex: "none" }} /> : x.level === "warn" ? <I.alert size={16} style={{ color: "var(--gold)", flex: "none" }} /> : <I.info size={16} className="faint" style={{ flex: "none" }} />}<span>{x.text}</span></div>)}</div>}<p className="xsmall muted mt-2" style={{ margin: ".5rem 0 0" }}>Advice only; nothing here stops you saving. Pitcher rest uses the league's pitch-count rules as of the game date.</p></Card>
      <Card title="Innings by player"><div className="table-wrap"><table className="table"><thead><tr><th>Player</th><th className="num">Field</th><th className="num">Off</th><th>Positions</th></tr></thead><tbody>{lines.map((l) => <tr key={l.playerId}><td>{nameOf(l.playerId)}</td><td className="num">{l.field}</td><td className="num">{l.off}{l.unplaced ? <span className="xsmall muted"> +{l.unplaced} unplaced</span> : null}</td><td className="small">{Object.entries(l.positions).map(([k, v]) => `${k}×${v}`).join(" · ") || "—"}</td></tr>)}</tbody></table></div></Card>
    </div>
    <Card title="Notes">{owner ? <Textarea aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Matchups, who warms up when, reminders for the dugout." /> : <p className="small">{gp.notes || "No notes."}</p>}</Card>
    {share && <ShareModal gp={gp} onClose={() => setShare(false)} />}
  </Page>;
}
function ShareModal({ gp, onClose }: { gp: GamePlan; onClose: () => void }) {
  const ss = useSession(); const t = ss.tenant!; const targets = gamePlanShareTargets(t, gp.teamId); const [sel, setSel] = useState<Set<string>>(new Set(gp.sharedWithUserIds)); const groups = ["Coaches", "League staff", "Team families"] as const;
  return <Modal title="Share this game plan" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={async () => { const r = await run(() => actions.shareGamePlan(gp.id, [...sel]), sel.size ? `Shared with ${plural(sel.size, "person")}.` : "The plan is private again."); if (r) onClose(); }}>{sel.size ? `Share with ${plural(sel.size, "person")}` : "Keep private"}</Button></>}>
    <div className="col gap-3"><Notice kind="info">People you pick can read this plan and download the dugout card. Only you can change it. Untick everyone to make it private again.</Notice>
      {groups.map((g) => { const list = targets.filter((x) => x.group === g); if (!list.length) return null; return <div key={g} className="col gap-1"><span className="label">{g}</span>{list.map((x) => <Check key={x.userId} label={x.label} checked={sel.has(x.userId)} onChange={(v) => { const n = new Set(sel); if (v) n.add(x.userId); else n.delete(x.userId); setSel(n); }} />)}</div>; })}</div></Modal>;
}
/** Home card: game plans someone shared with the viewer. */
export function SharedGamePlansCard() {
  const ss = useSession(); const t = ss.tenant; if (!t) return null; const list = t.gamePlans.filter((g) => g.ownerUserId !== ss.userId); if (list.length === 0) return null;
  return <Card title={<span className="flex items-center gap-2"><I.clipboard size={18} />Game plans shared with you</span>}><div className="list">{list.map((g) => <button key={g.id} className="list-item clickable" style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => navigate("gameplan", g.id)}><span className="grow col" style={{ minWidth: 0 }}><span className="list-item-title">{g.title}</span><span className="list-item-sub">{t.teamName(g.teamId)} · {gameLabel(t, g.teamId, g.eventId)} · from {t.userName(g.ownerUserId)}</span></span><I.chevronRight size={16} className="faint" /></button>)}</div></Card>;
}
/** Landscape-style dugout card on a letter page: the grid, then notes. */
function buildPlanPdf(t: Tenant, gp: GamePlan, rows: PlanRow[], roster: Player[], title: string, notes: string): Uint8Array {
  const pdf = new SimplePdf(); const NAVY: [number, number, number] = [0.04, 0.1, 0.19]; const MUTED: [number, number, number] = [0.34, 0.4, 0.48]; const LINE: [number, number, number] = [0.8, 0.84, 0.9]; const SOFT: [number, number, number] = [0.93, 0.95, 0.98];
  const team = t.teamById.get(gp.teamId); const L = 24, W = 612 - 48; let y = 30;
  pdf.text(L, y, `${team?.name ?? ""} · ${gameLabel(t, gp.teamId, gp.eventId)}`.toUpperCase(), 8, { color: MUTED, bold: true }); y += 14; pdf.text(L, y, title, 18, { bold: true, color: NAVY }); y += 30;
  const cols = [{ label: "Inn", w: 26 }, ...PLAN_COLUMNS.map((c) => ({ label: c.label, w: (W - 26) / PLAN_COLUMNS.length }))]; const rowH = 34;
  let x = L; pdf.rect(L, y, W, 18, NAVY); for (const c of cols) { pdf.text(x + c.w / 2, y + 4, c.label, 8, { bold: true, color: [1, 1, 1], align: "center" }); x += c.w; } y += 18;
  rows.forEach((row, i) => { x = L; pdf.rect(L, y, W, rowH, i % 2 ? SOFT : [1, 1, 1], LINE); pdf.text(x + 13, y + 11, String(i + 1), 11, { bold: true, color: NAVY, align: "center" }); x += cols[0].w; PLAN_COLUMNS.forEach((c, k) => { const w = cols[k + 1].w; const p = row[c.key] ? t.playerById.get(row[c.key]) : undefined; if (p) { const nm = p.displayName.length > 9 ? p.displayName.slice(0, 9) : p.displayName; pdf.text(x + w / 2, y + 8, nm, 7.5, { bold: true, color: NAVY, align: "center" }); if (p.jerseyNumber) pdf.text(x + w / 2, y + 19, `#${p.jerseyNumber}`, 7, { color: MUTED, align: "center" }); } pdf.line(x, y, x, y + rowH, LINE, 0.5); x += w; }); y += rowH; });
  y += 18; pdf.text(L, y, "Innings by player", 11, { bold: true, color: NAVY }); y += 16; const lines = playerLines(rows, roster);
  lines.forEach((l, i) => { const colX = L + (i % 3) * (W / 3); const rowY = y + Math.floor(i / 3) * 14; const p = t.playerById.get(l.playerId); pdf.text(colX, rowY, `${p?.displayName ?? ""}: ${l.field} field, ${l.off} off · ${Object.entries(l.positions).map(([k, v]) => `${k}${v > 1 ? "x" + v : ""}`).join(" ")}`, 8, { color: NAVY }); }); y += Math.ceil(lines.length / 3) * 14 + 12;
  if (notes.trim()) { pdf.text(L, y, "Notes", 11, { bold: true, color: NAVY }); y += 16; pdf.paragraph(L, y, notes, 9, W, { color: NAVY }); }
  pdf.text(L, 770, "GamePlanIQ · private game plan", 7, { color: MUTED });
  return pdf.build();
}
