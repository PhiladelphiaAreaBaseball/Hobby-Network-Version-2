/* Forms: validation and result summaries shared by the builder, the response page and the review table. */
import type { FormAnswer, FormField, FormResponse, LeagueForm } from "../core/types";

export const FIELD_TYPE_LABEL: Record<FormField["type"], string> = { text: "Short answer", long_text: "Paragraph", number: "Number", rating: "1–5 rating", choice: "Single choice", multi: "Choose any", yes_no: "Yes / no", date: "Date", signature: "Typed signature" };
export function answered(v: FormAnswer | undefined): boolean { if (v === undefined || v === null) return false; if (typeof v === "string") return v.trim() !== ""; if (Array.isArray(v)) return v.length > 0; return true; }
/** Returns the ids of required fields that are missing or invalid. */
export function validateAnswers(form: Pick<LeagueForm, "fields">, answers: Record<string, FormAnswer>): { fieldId: string; problem: string }[] {
  const out: { fieldId: string; problem: string }[] = [];
  for (const f of form.fields) { const v = answers[f.id]; if (f.required && !answered(v)) { out.push({ fieldId: f.id, problem: "Required" }); continue; } if (!answered(v)) continue; if (f.type === "rating" && (typeof v !== "number" || v < 1 || v > 5)) out.push({ fieldId: f.id, problem: "Choose 1 to 5" }); if (f.type === "number" && (typeof v !== "number" || Number.isNaN(v))) out.push({ fieldId: f.id, problem: "Enter a number" }); if (f.type === "date" && typeof v === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) out.push({ fieldId: f.id, problem: "Enter a date" }); if (f.type === "signature" && (typeof v !== "string" || v.trim().split(/\s+/).length < 2)) out.push({ fieldId: f.id, problem: "Type your full name" }); if (f.type === "choice" && f.options && typeof v === "string" && !f.options.includes(v)) out.push({ fieldId: f.id, problem: "Pick one of the options" }); }
  return out;
}
export interface FieldSummary { field: FormField; n: number; avg: number | null; dist: number[] | null; counts: Record<string, number> | null; texts: string[]; yes: number | null; }
export function summarize(form: LeagueForm, responses: FormResponse[]): { responses: number; byField: FieldSummary[] } {
  const rs = responses.filter((r) => r.formId === form.id);
  const byField = form.fields.map((field) => { const vals = rs.map((r) => r.answers[field.id]).filter(answered); const base: FieldSummary = { field, n: vals.length, avg: null, dist: null, counts: null, texts: [], yes: null };
    if (field.type === "rating" || field.type === "number") { const nums = vals.map(Number).filter((n) => !Number.isNaN(n)); base.avg = nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null; if (field.type === "rating") base.dist = [1, 2, 3, 4, 5].map((k) => nums.filter((n) => n === k).length); }
    else if (field.type === "choice" || field.type === "multi") { const counts: Record<string, number> = {}; for (const v of vals) for (const x of Array.isArray(v) ? v : [String(v)]) counts[x] = (counts[x] ?? 0) + 1; base.counts = counts; }
    else if (field.type === "yes_no") base.yes = vals.filter((v) => v === true || v === "yes").length;
    else base.texts = vals.map(String).slice(0, 50);
    return base; });
  return { responses: rs.length, byField };
}
/** Who is expected to answer: per-player forms count players in the audience's care; others count people. */
export function expectedCount(form: LeagueForm, counts: { guardians: number; coaches: number; volunteers: number; staff: number; players: number; rosteredPlayers: number }): number {
  if (form.perPlayer) return form.audience === "coach" ? counts.rosteredPlayers : counts.players;
  switch (form.audience) { case "guardian": return counts.guardians; case "coach": return counts.coaches; case "volunteer": return counts.volunteers; case "staff": return counts.staff; default: return counts.guardians + counts.coaches + counts.volunteers; }
}
export function isOpenNow(form: LeagueForm, today: string) { return form.status === "open" && form.opensAt <= today && form.closesAt >= today; }
