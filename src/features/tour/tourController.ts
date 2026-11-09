/* Guided tour controller. Content lives in data/content/tour.json; this module only moves between stops.
   Each stop signs in as the section's persona and opens its route, then the Tour overlay explains the screen
   and points at the thing to try. State is kept in the store and mirrored to localStorage so a reload resumes. */
import { store, type TourState } from "../../core/store";
import { navigate, parseRoute } from "../../core/router";
import { signInPersona } from "../../app/shell/AppShell";
import { safeLocalGet, safeLocalRemove, safeLocalSet } from "../../core/util";
import type { TourContent, TourSection, TourStep } from "../../core/types";

export const TOUR_KEY = "gameplaniq:v1:tour";
export interface TourStop { section: TourSection; sectionIdx: number; step: TourStep; stepIdx: number; index: number }

export function tourContent(): TourContent | null { return store.get().content?.tour ?? null; }
export function tourStops(content: TourContent | null = tourContent()): TourStop[] {
  if (!content) return []; const out: TourStop[] = []; content.sections.forEach((section, sectionIdx) => section.steps.forEach((step, stepIdx) => out.push({ section, sectionIdx, step, stepIdx, index: out.length })));
  return out;
}
export function currentStop(state: TourState | null, content: TourContent | null = tourContent()): TourStop | null {
  if (!state || !content) return null; const section = content.sections[state.section]; const step = section?.steps[state.step]; if (!section || !step) return null;
  const index = content.sections.slice(0, state.section).reduce((a, s) => a + s.steps.length, 0) + state.step; return { section, sectionIdx: state.section, step, stepIdx: state.step, index };
}
function persist(state: TourState | null) { if (state) safeLocalSet(TOUR_KEY, JSON.stringify(state)); else safeLocalRemove(TOUR_KEY); }
function setState(state: TourState | null) { store.set((s) => ({ ui: { ...s.ui, tour: state } })); persist(state); }
/** Signs in as the stop's persona and opens its screen. */
function open(stop: TourStop) {
  const s = store.get(); if (s.session?.personaId !== stop.section.persona) signInPersona(stop.section.persona);
  const r = parseRoute("#" + stop.step.route); setTimeout(() => { navigate(r.name, r.id); store.set((x) => ({ ui: { ...x.ui, railOpen: false } })); }, 30);
}
function goTo(sectionIdx: number, stepIdx: number) {
  const content = tourContent(); if (!content) return; const section = content.sections[sectionIdx]; if (!section) { finish(); return; }
  const state: TourState = { section: sectionIdx, step: Math.min(stepIdx, section.steps.length - 1), hidden: false, done: false }; setState(state); const stop = currentStop(state, content); if (stop) open(stop);
}
function finish() { const st = store.get().ui.tour; setState({ section: st?.section ?? 0, step: st?.step ?? 0, hidden: false, done: true }); }
export function startTour(sectionIdx = 0) { goTo(sectionIdx, 0); store.toast("Guided tour started. Use Next, Back and Skip this section at the bottom of the screen.", "info"); }
export function stopTour() { setState(null); }
export function tourNext() {
  const content = tourContent(); const st = store.get().ui.tour; if (!content || !st) return;
  const section = content.sections[st.section]; if (st.step + 1 < section.steps.length) goTo(st.section, st.step + 1); else if (st.section + 1 < content.sections.length) goTo(st.section + 1, 0); else finish();
}
export function tourBack() {
  const content = tourContent(); const st = store.get().ui.tour; if (!content || !st) return;
  if (st.done) { goTo(st.section, st.step); return; }
  if (st.step > 0) goTo(st.section, st.step - 1); else if (st.section > 0) goTo(st.section - 1, content.sections[st.section - 1].steps.length - 1);
}
export function tourSkipSection() { const content = tourContent(); const st = store.get().ui.tour; if (!content || !st) return; if (st.section + 1 < content.sections.length) goTo(st.section + 1, 0); else finish(); }
export function tourJump(sectionIdx: number) { goTo(sectionIdx, 0); }
export function tourHide(hidden: boolean) { const st = store.get().ui.tour; if (!st) return; setState({ ...st, hidden }); }
/** Called once on boot: a tour that was in progress before a reload continues on whatever screen is open. */
export function resumeSavedTour() {
  if (store.get().ui.tour) return; const raw = safeLocalGet(TOUR_KEY); if (!raw) return;
  try { const st = JSON.parse(raw) as TourState; if (typeof st.section === "number" && typeof st.step === "number" && currentStop({ ...st, done: false })) store.set((s) => ({ ui: { ...s.ui, tour: { hidden: !!st.hidden, done: !!st.done, section: st.section, step: st.step } } })); else safeLocalRemove(TOUR_KEY); } catch { safeLocalRemove(TOUR_KEY); }
}
/** Resolves a stop's `target` spec to a visible element on the page. Specs: `button:Label`, `tab:Label`, `nav:Label`, `css:selector`. */
export function findTourTarget(spec: string): HTMLElement | null {
  const i = spec.indexOf(":"); const kind = i < 0 ? "button" : spec.slice(0, i); const label = (i < 0 ? spec : spec.slice(i + 1)).trim().toLowerCase();
  const outside = (el: Element) => !el.closest(".tour-panel, .tour-spot, .toasts");
  if (kind === "css") { const el = document.querySelector<HTMLElement>(label); return el && outside(el) ? el : null; }
  const sel = kind === "tab" ? "[role=tab]" : kind === "nav" ? ".nav-item" : "button, a, [role=button]";
  const norm = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const els = [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => outside(el) && el.offsetParent !== null && !el.closest(".rail"));
  return els.find((el) => norm(el) === label) ?? els.find((el) => norm(el).startsWith(label)) ?? null;
}
