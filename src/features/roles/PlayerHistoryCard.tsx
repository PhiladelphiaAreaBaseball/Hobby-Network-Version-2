import { useMemo, useState } from "react";
import { Badge, Button, Card, Stat } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession } from "../../core/hooks";
import { navigate } from "../../core/router";
import { fmtDate } from "../../core/dates";
import { playerHistory } from "../../engines/playerHistory";

const KIND_LABEL: Record<string, string> = { season: "Season", game: "Game", attendance: "Attendance", tryout: "Tryout", report: "Report card", badge: "Badge", pitching: "Pitching", evaluation: "Evaluation", assignment: "Home practice" };
/** One timeline across seasons: teams, positions, attendance, tryouts, report cards, badges, pitch counts, evaluations. */
export function PlayerHistoryCard({ playerId }: { playerId: string }) {
  const ss = useSession(); const t = ss.tenant!; const h = useMemo(() => playerHistory(t, playerId), [t, playerId]); const [filter, setFilter] = useState<string>("all"); const [limit, setLimit] = useState(12);
  const kinds = [...new Set(h.items.map((i) => i.kind))]; const shown = h.items.filter((i) => filter === "all" || i.kind === filter);
  return <Card title={<span className="flex items-center gap-2"><I.clock size={18} />History</span>} action={<span className="xsmall muted">{h.items.length} entries across {h.seasons.length} {h.seasons.length === 1 ? "season" : "seasons"}</span>}>
    <div className="stats" style={{ marginBottom: ".75rem" }}><Stat label="Seasons" value={h.seasons.length} hint={h.seasons.map((s) => s.divisionName).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "—"} /><Stat label="Attendance" value={h.attendance.total ? `${Math.round((h.attendance.present / h.attendance.total) * 100)}%` : "—"} hint={h.attendance.total ? `${h.attendance.present} of ${h.attendance.total} taken` : "none taken yet"} /><Stat label="Positions" value={h.positions.length} hint={h.positions.slice(0, 4).map((p) => `${p.position} ${p.innings}`).join(" · ") || "no lineups yet"} /><Stat label="Pitching" value={h.pitching.appearances} hint={h.pitching.appearances ? `${h.pitching.pitches} pitches · max ${h.pitching.max}` : "no appearances"} /></div>
    {h.positions.length > 0 && <div className="flex gap-2 wrap mb-3">{h.positions.map((p) => <Badge key={p.position}>{p.position} · {p.innings} {p.innings === 1 ? "inning" : "innings"} in {p.games} {p.games === 1 ? "game" : "games"}</Badge>)}</div>}
    <div className="chips mb-3"><button type="button" className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All</button>{kinds.map((k) => <button key={k} type="button" className={`chip ${filter === k ? "on" : ""}`} onClick={() => setFilter(k)}>{KIND_LABEL[k] ?? k}</button>)}</div>
    {shown.length === 0 ? <p className="small muted">Nothing recorded yet.</p> : <div className="timeline">{shown.slice(0, limit).map((it, i) => <div key={i} className={`timeline-item tl-${it.kind}`}><div className="timeline-dot" /><div className="col" style={{ minWidth: 0 }}><span className="xsmall muted">{fmtDate(it.date)} · {KIND_LABEL[it.kind] ?? it.kind}</span><span className="small"><strong>{it.title}</strong>{it.detail ? ` · ${it.detail}` : ""}{it.link && <> · <button className="link-btn xsmall" onClick={() => navigate(it.link!.name, it.link!.id)}>open</button></>}</span></div></div>)}</div>}
    {shown.length > limit && <div className="mt-2"><Button size="sm" variant="ghost" onClick={() => setLimit(limit + 20)}>Show more</Button></div>}
  </Card>;
}
