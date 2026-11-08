import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Notice } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession } from "../../core/hooks";
import { navigate } from "../../core/router";
import { actions, run } from "../../core/actions";
import { YouTubeCard } from "../../components/YouTubeCard";
import { AssignModal } from "../academy/AcademyPages";
import { safeLocalGet, safeLocalSet, safeLocalRemove, plural } from "../../core/util";
import type { GeneratedBlock, PracticePlan } from "../../core/types";

const KEY = (id: string) => `gameplaniq:v1:run:${id}`;
/** Phone-first, full-screen practice runner: one block at a time, a big clock, cues, the drill video one tap away. */
export function RunPracticePage({ id }: { id: string }) {
  const ss = useSession(); const t = ss.tenant!; const plan = t.practicePlans.find((p) => p.id === id);
  if (!plan) return <div className="run"><div className="run-body"><Notice kind="warn">This practice is gone. <button className="link-btn" onClick={() => navigate("coaches")}>Back to Coaches' HQ</button></Notice></div></div>;
  const allowed = plan.createdByUserId === ss.userId || (plan.teamId && ss.can("team.view", { teamId: plan.teamId })) || (plan.playerId && t.playerById.get(plan.playerId)?.guardianUserIds.includes(ss.userId)) || ss.isStaff;
  if (!allowed) return <div className="run"><div className="run-body"><Notice kind="warn">This practice belongs to another coach or family.</Notice></div></div>;
  return <Runner plan={plan} />;
}
function Runner({ plan }: { plan: PracticePlan }) {
  const ss = useSession(); const t = ss.tenant!; const timed = useMemo(() => plan.blocks.filter((b) => b.minutes > 0), [plan.blocks]); const total = timed.reduce((a, b) => a + b.minutes, 0);
  const saved = (() => { try { const raw = safeLocalGet(KEY(plan.id)); return raw ? (JSON.parse(raw) as { idx: number; left: number; extra: number[] }) : null; } catch { return null; } })();
  const [idx, setIdx] = useState(saved && saved.idx < timed.length ? saved.idx : 0); const [left, setLeft] = useState(saved && saved.idx < timed.length ? saved.left : (timed[0]?.minutes ?? 0) * 60); const [extra, setExtra] = useState<number[]>(saved?.extra ?? timed.map(() => 0)); const [running, setRunning] = useState(false); const [done, setDone] = useState(false); const [showList, setShowList] = useState(false); const [assign, setAssign] = useState(false); const [logged, setLogged] = useState(false);
  const block = timed[idx]; const next = timed[idx + 1]; const wake = useRef<any>(null);
  useEffect(() => { if (!running) return; const h = setInterval(() => setLeft((x) => (x > 0 ? x - 1 : 0)), 1000); return () => clearInterval(h); }, [running]);
  useEffect(() => { safeLocalSet(KEY(plan.id), JSON.stringify({ idx, left, extra })); }, [idx, left, extra, plan.id]);
  useEffect(() => { const nav: any = navigator; if (!running || !nav.wakeLock) return; let active = true; nav.wakeLock.request("screen").then((l: any) => { if (active) wake.current = l; else l.release(); }).catch(() => {}); return () => { active = false; wake.current?.release?.(); wake.current = null; }; }, [running]);
  useEffect(() => { if (left === 0 && running && block) { if (idx < timed.length - 1) goTo(idx + 1); else setRunning(false); } }, [left]);
  const goTo = (i: number) => { if (i < 0 || i >= timed.length) return; setIdx(i); setLeft(timed[i].minutes * 60 + (extra[i] ?? 0) * 60); };
  const adjust = (min: number) => { setLeft((x) => Math.max(0, x + min * 60)); setExtra((e) => e.map((v, k) => (k === idx ? v + min : v))); };
  const finish = async () => { setRunning(false); setDone(true); safeLocalRemove(KEY(plan.id)); if (!logged) { const ok = await run(() => actions.markPlanComplete(plan.id), plan.kind === "team" ? "Practice logged for the team." : "Practice logged."); if (ok !== undefined) setLogged(true); } };
  const exit = () => navigate("practice-plan", plan.id);
  const elapsedBefore = timed.slice(0, idx).reduce((a, b, k) => a + b.minutes + (extra[k] ?? 0), 0); const mm = String(Math.floor(left / 60)).padStart(2, "0"), sS = String(left % 60).padStart(2, "0");
  const video = block?.drillId ? t.drills.find((d) => d.id === block.drillId)?.video : undefined; const lesson = block?.lessonId ? t.lessonById.get(block.lessonId) : undefined; const homeLesson = plan.blocks.find((b) => b.lessonId)?.lessonId;
  const phaseLabel: Record<string, string> = { warmup: "Warm-up", skill: "Skill", game: "Game", cooldown: "Cool-down", station: "Stations", team: "Team", wrapup: "Wrap-up" };
  if (done) return <div className="run"><header className="run-head"><span className="run-eyebrow">Practice complete</span><button className="btn btn-ghost btn-icon" style={{ color: "inherit" }} aria-label="Close" onClick={exit}><I.close /></button></header><div className="run-body"><div className="run-finish"><I.check size={48} /><h1>{plan.title}</h1><p>{plural(timed.length, "block")} · {total + extra.reduce((a, b) => a + b, 0)} minutes{plan.teamId ? ` · ${t.teamName(plan.teamId)}` : ""}</p>{plan.recap && <p className="run-recap">{plan.recap}</p>}<div className="run-actions">{homeLesson && plan.kind === "team" && ss.isCoach && <Button size="lg" variant="primary" icon={<I.parents size={18} />} onClick={() => setAssign(true)}>Assign home practice</Button>}<Button size="lg" variant="chrome" onClick={exit}>Back to the plan</Button><Button size="lg" variant="ghost" style={{ color: "inherit" }} onClick={() => navigate(plan.kind === "team" ? "coaches" : "practice")}>{plan.kind === "team" ? "Coaches' HQ" : "Practice generator"}</Button></div></div></div>{assign && homeLesson && <AssignModal lessonId={homeLesson} teamId={plan.teamId} onClose={() => setAssign(false)} />}</div>;
  if (!block) return <div className="run"><div className="run-body"><Notice kind="warn">This plan has no timed blocks.</Notice><Button onClick={exit}>Back</Button></div></div>;
  return <div className={`run ${running ? "live" : ""}`}>
    <header className="run-head"><div className="col" style={{ minWidth: 0 }}><span className="run-eyebrow">{plan.title}{plan.teamId ? ` · ${t.teamName(plan.teamId)}` : ""}</span><span className="run-sub">Block {idx + 1} of {timed.length} · {elapsedBefore} of {total} min</span></div><div className="flex gap-1"><button className="btn btn-ghost btn-icon" style={{ color: "inherit" }} aria-label="All blocks" aria-expanded={showList} onClick={() => setShowList(!showList)}><I.list /></button><button className="btn btn-ghost btn-icon" style={{ color: "inherit" }} aria-label="Exit practice" onClick={exit}><I.close /></button></div></header>
    <div className="run-progress" aria-hidden="true">{timed.map((b, k) => <span key={k} className={k < idx ? "done" : k === idx ? "on" : ""} style={{ flex: b.minutes }} />)}</div>
    {showList && <div className="run-list" role="list">{timed.map((b, k) => <button key={k} role="listitem" className={`run-list-item ${k === idx ? "on" : ""}`} onClick={() => { goTo(k); setShowList(false); }}><span className="tnum">{b.minutes}′</span><span className="grow truncate">{b.title}</span>{k < idx && <I.check size={16} />}</button>)}</div>}
    <div className="run-body">
      <div className="run-clock" role="timer" aria-live="off"><span className="run-phase">{phaseLabel[block.phase] ?? block.phase}</span><span className={`run-time ${left <= 30 && running ? "ending" : ""}`}>{mm}:{sS}</span><h1 className="run-title">{block.title}</h1>{block.groups && <span className="run-groups">{block.groups}</span>}</div>
      <div className="run-controls"><Button size="lg" variant="ghost" style={{ color: "inherit" }} aria-label="Previous block" disabled={idx === 0} onClick={() => goTo(idx - 1)}><I.chevronLeft size={22} /></Button><Button size="lg" variant="ghost" style={{ color: "inherit" }} onClick={() => adjust(-1)} disabled={left < 60}>−1 min</Button><Button size="lg" variant={running ? "chrome" : "primary"} className="run-main-btn" icon={running ? undefined : <I.play size={20} />} onClick={() => setRunning(!running)}>{running ? "Pause" : left === block.minutes * 60 + (extra[idx] ?? 0) * 60 ? "Start" : "Resume"}</Button><Button size="lg" variant="ghost" style={{ color: "inherit" }} onClick={() => adjust(1)}>+1 min</Button>{next ? <Button size="lg" variant="ghost" style={{ color: "inherit" }} aria-label="Next block" onClick={() => goTo(idx + 1)}><I.chevronRight size={22} /></Button> : <Button size="lg" variant="success" onClick={finish}>Finish</Button>}</div>
      <div className="run-cards">
        {block.setup && <div className="run-card"><span className="run-card-label">Setup</span><p>{block.setup}</p></div>}
        <div className="run-card"><span className="run-card-label">How it runs</span><ol>{block.instructions.map((s, i) => <li key={i}>{s}</li>)}</ol>{block.reps && <p className="run-reps"><strong>Reps:</strong> {block.reps}</p>}</div>
        {block.cues.length > 0 && <div className="run-card"><span className="run-card-label">Say this</span><div className="flex gap-2 wrap">{block.cues.map((c) => <span key={c} className="run-cue">{c}</span>)}</div></div>}
        {video && <div className="run-card"><span className="run-card-label">Show them</span><YouTubeCard video={video} compact /></div>}
        {(block.safety?.length || block.parentTip) ? <div className="run-card warn"><span className="run-card-label">Watch for</span>{block.safety?.map((s, i) => <p key={i}>{s}</p>)}{block.parentTip && <p>{block.parentTip}</p>}</div> : null}
        {lesson && <div className="run-card"><span className="run-card-label">Lesson behind this block</span><button className="link-btn" style={{ color: "var(--sky)" }} onClick={() => navigate("lesson", lesson.id)}>{lesson.title}</button></div>}
      </div>
      {next && <button className="run-next" onClick={() => goTo(idx + 1)}><span className="run-card-label">Up next · {next.minutes} min</span><span className="grow truncate">{next.title}</span><I.chevronRight size={18} /></button>}
      {idx === timed.length - 1 && <p className="run-sub" style={{ textAlign: "center" }}>Last block. Tap Finish when you are done; the practice is logged{plan.kind === "team" ? " and you can send the home assignment" : ""}.</p>}
    </div>
  </div>;
}
export function blocksSummary(blocks: GeneratedBlock[]) { return blocks.filter((b) => b.minutes > 0).map((b) => `${b.minutes}′ ${b.title}`).join(" · "); }
