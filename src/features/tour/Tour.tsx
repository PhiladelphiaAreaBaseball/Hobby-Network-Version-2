import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../core/store";
import { Button, Progress } from "../../components/ui";
import { I } from "../../components/icons";
import { navigate } from "../../core/router";
import { signInPersona } from "../../app/shell/AppShell";
import { currentStop, findTourTarget, resumeSavedTour, startTour, stopTour, tourBack, tourHide, tourJump, tourNext, tourSkipSection, tourStops } from "./tourController";

/** The guided-tour overlay: a spotlight ring on the thing to try plus a control panel with Next, Back, Skip this section and Hide. */
export function Tour() {
  const s = useAppStore(); const content = s.content?.tour ?? null; const st = s.ui.tour; const panelRef = useRef<HTMLElement | null>(null); const [side, setSide] = useState<"right" | "left">("right");
  const stepKey = st ? `${st.section}.${st.step}` : ""; useEffect(() => { setSide("right"); }, [stepKey]);
  /* On a wide screen the panel moves to the other side when it would cover the thing to try. */
  const onMeasure = (rect: DOMRect) => { const panel = panelRef.current; if (!panel || window.innerWidth <= 760) return; const pr = panel.getBoundingClientRect(); const vertical = rect.bottom > pr.top && rect.top < pr.bottom; if (!vertical) return; const railW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rail-w")) || 0; const leftBox = { left: railW + 16, right: railW + 16 + pr.width }; const rightBox = { left: window.innerWidth - 16 - pr.width, right: window.innerWidth - 16 }; const hits = (b: { left: number; right: number }) => rect.right > b.left && rect.left < b.right; if (side === "right" && hits(rightBox) && !hits(leftBox)) setSide("left"); else if (side === "left" && hits(leftBox) && !hits(rightBox)) setSide("right"); };
  const panelRect = () => panelRef.current?.getBoundingClientRect() ?? null;
  useEffect(() => { resumeSavedTour(); }, []);
  useEffect(() => { document.body.classList.toggle("tour-active", !!st && !st.hidden); return () => document.body.classList.remove("tour-active"); }, [st]);
  useEffect(() => {
    if (!st || st.hidden || st.done) return;
    const onKey = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; if (document.querySelector(".scrim")) return; if (e.key === "ArrowRight") { e.preventDefault(); tourNext(); } else if (e.key === "ArrowLeft") { e.preventDefault(); tourBack(); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [st]);
  if (!content || !st || !s.session) return null;
  const stops = tourStops(content); const stop = currentStop(st, content);
  if (st.hidden) return <button className="tour-pill" onClick={() => tourHide(false)}><I.play size={16} />Resume tour{stop ? <span className="tour-pill-sub">· {stop.step.title}</span> : null}</button>;
  if (st.done || !stop) return <aside className="tour-panel" role="dialog" aria-label="Guided tour finished"><div className="tour-head"><span className="tour-part">Tour complete</span><button className="btn btn-ghost btn-icon" aria-label="Close the tour" onClick={stopTour}><I.close size={16} /></button></div>
    <div className="tour-body"><h3 className="tour-title">{content.closing.title}</h3>{content.closing.lines.map((l, i) => <p key={i} className="small">{l}</p>)}</div>
    <div className="tour-foot"><Button variant="primary" icon={<I.refresh size={16} />} onClick={() => startTour(0)}>Start over</Button><Button onClick={() => { stopTour(); signInPersona("persona_admin"); setTimeout(() => navigate("demo", "guide"), 30); }}>Presenter guide</Button><Button variant="ghost" onClick={stopTour}>Explore on my own</Button></div></aside>;
  const first = stop.index === 0; const last = stop.index === stops.length - 1; const lastInSection = stop.stepIdx === stop.section.steps.length - 1;
  return <>
    <Spotlight spec={stop.step.target} routeKey={`${s.route.raw}|${stop.index}`} onMeasure={onMeasure} avoid={panelRect} />
    <aside ref={panelRef} className={`tour-panel ${side === "left" ? "tour-panel-left" : ""}`} role="dialog" aria-label="Guided tour">
      <div className="tour-head"><span className="tour-part">Part {stop.sectionIdx + 1} of {content.sections.length} · {stop.section.title}</span><span className="flex items-center gap-1"><label className="sr-only" htmlFor="tour-jump">Jump to a section</label><select id="tour-jump" className="tour-jump" value={stop.sectionIdx} onChange={(e) => tourJump(Number(e.target.value))} aria-label="Jump to a section">{content.sections.map((sec, i) => <option key={sec.id} value={i}>Part {i + 1} · {sec.title}</option>)}</select><button className="btn btn-ghost btn-icon" aria-label="Exit the tour" title="Exit the tour" onClick={stopTour}><I.close size={16} /></button></span></div>
      <div className="tour-body">
        <div className="tour-progress"><Progress value={stop.index + 1} max={stops.length} tone="grass" label="Tour progress" /><span className="xsmall muted">Stop {stop.index + 1} of {stops.length}</span></div>
        {stop.stepIdx === 0 && <p className="xsmall muted" style={{ margin: 0 }}>{stop.section.summary}</p>}
        <h3 className="tour-title">{stop.step.title}</h3>
        {stop.step.explain.map((l, i) => <p key={i} className="small" style={{ margin: 0 }}>{l}</p>)}
        {stop.step.try && stop.step.try.length > 0 && <div className="tour-try"><span className="guide-label">Try it</span><ul className="small col gap-1" style={{ paddingLeft: "1.1rem", margin: 0 }}>{stop.step.try.map((l, i) => <li key={i}>{l}</li>)}</ul></div>}
        {first && <details className="tour-how" open><summary className="small"><strong>How the tour works</strong></summary><ul className="xsmall col gap-1" style={{ paddingLeft: "1.1rem", margin: ".3rem 0 0" }}>{content.controls.map((c, i) => <li key={i}>{c}</li>)}</ul></details>}
      </div>
      <div className="tour-foot">
        <Button size="sm" variant="ghost" icon={<I.chevronLeft size={14} />} disabled={first} onClick={tourBack}>Back</Button>
        <Button size="sm" variant="primary" onClick={tourNext}>{last ? "Finish" : "Next"}<I.chevronRight size={14} /></Button>
        <Button size="sm" onClick={tourSkipSection}>{lastInSection && !last ? "Next section" : last ? "Finish" : "Skip this section"}</Button>
        <Button size="sm" variant="ghost" onClick={() => tourHide(true)}>Hide</Button>
      </div>
    </aside>
  </>;
}

/** Finds the stop's target on the page (polling while the screen renders), scrolls it into view and draws a ring around it. */
function Spotlight({ spec, routeKey, onMeasure, avoid }: { spec?: string; routeKey: string; onMeasure?: (r: DOMRect) => void; avoid?: () => DOMRect | null }) {
  const [rect, setRect] = useState<DOMRect | null>(null); const elRef = useRef<HTMLElement | null>(null); const cbRef = useRef({ onMeasure, avoid }); cbRef.current = { onMeasure, avoid };
  useEffect(() => {
    elRef.current = null; setRect(null); if (!spec) return;
    let tries = 0; let scrolled = false; let alive = true;
    const measure = () => { if (!alive) return; const el = elRef.current && document.contains(elRef.current) && elRef.current.offsetParent !== null ? elRef.current : findTourTarget(spec); elRef.current = el; if (!el) { setRect(null); return; } if (!scrolled) { scrolled = true; try { el.scrollIntoView({ block: "center" }); const r0 = el.getBoundingClientRect(); const panel = cbRef.current.avoid?.(); const topbar = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0; const visibleBottom = panel && panel.left <= 8 ? panel.top : window.innerHeight; const want = (topbar + visibleBottom) / 2; const have = r0.top + r0.height / 2; if (Math.abs(have - want) > 24 && r0.height < visibleBottom - topbar) window.scrollBy({ top: have - want }); } catch { /* older browsers */ } } const r = el.getBoundingClientRect(); setRect(r); cbRef.current.onMeasure?.(r); };
    const poll = setInterval(() => { tries++; measure(); if (elRef.current && tries > 3) { clearInterval(poll); } if (tries > 25) clearInterval(poll); }, 200);
    const tick = setInterval(measure, 600); window.addEventListener("scroll", measure, true); window.addEventListener("resize", measure);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); window.removeEventListener("scroll", measure, true); window.removeEventListener("resize", measure); };
  }, [spec, routeKey]);
  if (!rect || rect.width === 0) return null;
  return <div className="tour-spot" aria-hidden="true" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}><span className="tour-spot-chip">Try this</span></div>;
}
