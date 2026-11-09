/* Did the team actually run the curriculum it was assigned? A week counts as covered when, inside that week's
   window, the coach completed a team practice whose blocks teach one of the week's lessons, or assigned one of
   them as home practice. Advisory: it tells the board where to offer help, never a grade for the coach. */
import type { Assignment, Curriculum, Drill, PracticePlan, TeamCurriculum } from "../core/types";
import { addDays, parseLocal, toIsoDate } from "../core/dates";

export interface WeekStatus { week: number; title: string; start: string; end: string; elapsed: boolean; covered: boolean; evidence: string[]; }
export interface ComplianceSummary { weeksElapsed: number; weeksCovered: number; weeks: WeekStatus[]; pct: number; currentWeek: number | null; }

export function compliance(tc: TeamCurriculum, cur: Curriculum, plans: PracticePlan[], assignments: Assignment[], drills: Drill[], today: string): ComplianceSummary {
  const drillLesson = new Map(drills.map((d) => [d.id, d.lessonId])); const start = parseLocal(tc.startDate + "T12:00:00");
  const weeks: WeekStatus[] = cur.weeks.map((w) => { const s = addDays(start, (w.week - 1) * 7); const e = addDays(s, 6); const sIso = toIsoDate(s), eIso = toIsoDate(e); const lessons = new Set(w.lessonIds); const evidence: string[] = [];
    for (const p of plans) { if (p.teamId !== tc.teamId || !p.completedAt) continue; const d = p.completedAt.slice(0, 10); if (d < sIso || d > eIso) continue; const hit = p.blocks.some((b) => (b.lessonId && lessons.has(b.lessonId)) || (b.drillId && lessons.has(drillLesson.get(b.drillId) ?? ""))); if (hit) evidence.push(`Practice "${p.title}" on ${d}`); }
    for (const a of assignments) { if (a.teamId !== tc.teamId) continue; const d = a.assignedAt.slice(0, 10); if (d < sIso || d > eIso) continue; if (lessons.has(a.lessonId)) evidence.push(`Home practice assigned ${d}`); }
    return { week: w.week, title: w.title, start: sIso, end: eIso, elapsed: sIso <= today, covered: evidence.length > 0, evidence }; });
  const elapsed = weeks.filter((w) => w.elapsed); const covered = elapsed.filter((w) => w.covered); const current = weeks.find((w) => w.start <= today && w.end >= today);
  return { weeksElapsed: elapsed.length, weeksCovered: covered.length, weeks, pct: elapsed.length ? Math.round((covered.length / elapsed.length) * 100) : 0, currentWeek: current?.week ?? null };
}
