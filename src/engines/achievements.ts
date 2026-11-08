import type { Challenge, IQProgress, Lesson, LessonCompletion, PracticePlan, CurriculumEnrollment, AchievementAward, Player } from "../core/types";
export interface ProgressSnapshot { completions: LessonCompletion[]; practicePlans: PracticePlan[]; iq: IQProgress | null; enrollments: CurriculumEnrollment[]; lessons: Lesson[]; }
/** Evaluates which challenges a player has newly satisfied. Rewards learning and consistency, never throwing volume. */
export function challengeProgress(ch: Challenge, snap: ProgressSnapshot, now = new Date()): { value: number; target: number } {
  const within = <X extends { completedAt?: string }>(items: X[], days: number | null) => (days ? items.filter((i) => i.completedAt && now.getTime() - new Date(i.completedAt).getTime() <= days * 86400000) : items);
  const lessonById = new Map(snap.lessons.map((l) => [l.id, l]));
  const r = ch.rule; let value = 0;
  switch (r.type) {
    case "lessons_completed": value = within(snap.completions, r.periodDays).length; break;
    case "lessons_in_category": value = r.category ? within(snap.completions, r.periodDays).filter((c) => lessonById.get(c.lessonId)?.category === r.category).length : new Set(within(snap.completions, r.periodDays).map((c) => lessonById.get(c.lessonId)?.category).filter(Boolean)).size; break;
    case "practices_completed": value = within(snap.practicePlans.filter((p) => p.kind === "home" && p.completedAt), r.periodDays).reduce((a, p) => a + Math.max(1, p.timesCompleted), 0); break;
    case "parent_child_practice": value = snap.practicePlans.filter((p) => p.kind === "home" && p.completedAt && Number(p.params.participants ?? 1) >= 2).length; break;
    case "iq_correct": value = snap.iq ? Object.values(snap.iq.answers).filter((a) => a.correct).length : 0; break;
    case "positions_identified": value = snap.iq ? Object.entries(snap.iq.answers).filter(([id, a]) => a.correct && /^iqq-0[1-6]$/.test(id)).length : 0; break;
    case "curriculum_week_completed": value = snap.enrollments.reduce((a, e) => a + e.completedWeeks.length, 0); break;
    case "sportsmanship_lesson": value = snap.completions.filter((c) => lessonById.get(c.lessonId)?.category === "mental").length; break;
  }
  return { value, target: r.target };
}
export function evaluateChallenges(challenges: Challenge[], player: Player, snap: ProgressSnapshot, existing: AchievementAward[], now = new Date()): Challenge[] {
  const have = new Set(existing.filter((a) => a.playerId === player.id).map((a) => a.challengeId));
  const out: Challenge[] = [];
  for (const ch of challenges) {
    if (have.has(ch.id)) continue; if (!ch.ageGroups.includes(player.ageGroup)) continue;
    const { value, target } = challengeProgress(ch, snap, now); if (value >= target) out.push(ch);
  }
  return out;
}
