/* Coach certification: grading quizzes and computing each person's status against the league's module list.
   Module content lives in data/content/certification.json; the league decides which roles must complete what. */
import type { CertModule, Certification, Role } from "../core/types";
import { addDays, parseLocal, toIsoDate } from "../core/dates";

export interface QuizResult { correct: number; total: number; pct: number; passed: boolean; perQuestion: { id: string; correct: boolean; chosen: number | null; answer: number; explanation: string }[]; }
export function gradeQuiz(mod: CertModule, answers: Record<string, number | null | undefined>, passingPct: number): QuizResult {
  const per = mod.quiz.map((q) => { const chosen = answers[q.id] ?? null; return { id: q.id, correct: chosen === q.correct, chosen, answer: q.correct, explanation: q.explanation }; });
  const correct = per.filter((p) => p.correct).length; const total = mod.quiz.length; const pct = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, pct, passed: pct >= passingPct, perQuestion: per };
}
export type ModuleState = "complete" | "expiring" | "expired" | "not_started";
export interface ModuleStatus { module: CertModule; state: ModuleState; record: Certification | null; expiresAt: string | null; daysLeft: number | null; }
export interface PersonStatus { modules: ModuleStatus[]; requiredTotal: number; requiredDone: number; complete: boolean; nextExpiry: string | null; percent: number; }
/** Latest passing record per module decides the state; "expiring" means within 60 days of renewal. */
export function personStatus(modules: CertModule[], records: Certification[], userId: string, role: Role | null, today: string): PersonStatus {
  const t = parseLocal(today).getTime(); const applicable = role ? modules.filter((m) => m.audience.includes(role)) : modules;
  const statuses: ModuleStatus[] = applicable.map((m) => {
    const rec = records.filter((r) => r.userId === userId && r.moduleId === m.id && r.passed).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0] ?? null;
    if (!rec) return { module: m, state: "not_started", record: null, expiresAt: null, daysLeft: null };
    const exp = rec.expiresAt; const daysLeft = exp ? Math.ceil((parseLocal(exp).getTime() - t) / 86400000) : null;
    const state: ModuleState = daysLeft !== null && daysLeft < 0 ? "expired" : daysLeft !== null && daysLeft <= 60 ? "expiring" : "complete";
    return { module: m, state, record: rec, expiresAt: exp, daysLeft };
  });
  const req = statuses.filter((s) => s.module.required); const done = req.filter((s) => s.state === "complete" || s.state === "expiring");
  const expiries = statuses.map((s) => s.expiresAt).filter((x): x is string => !!x).sort();
  return { modules: statuses, requiredTotal: req.length, requiredDone: done.length, complete: req.length > 0 && done.length === req.length, nextExpiry: expiries[0] ?? null, percent: req.length ? Math.round((done.length / req.length) * 100) : 0 };
}
export function expiryFor(mod: CertModule, completedAt: string) { return toIsoDate(addDays(parseLocal(completedAt.slice(0, 10)), Math.round(mod.renewMonths * 30.44))); }
export const STATE_LABEL: Record<ModuleState, string> = { complete: "Complete", expiring: "Renew soon", expired: "Expired", not_started: "Not started" };
