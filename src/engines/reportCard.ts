/* Player report cards: a coach rates the same skills they track in practice, and the engine turns each
   "not yet" into a short list of Academy lessons tuned to the player's age. Content stays in data/content. */
import type { AgeGroupId, Category, Lesson, PlayerNote, ReportCard, SkillRating } from "../core/types";

export interface ReportSkill { id: string; label: string; category: Category; subcategories: string[]; parentCue: string; }
export const REPORT_SKILLS: ReportSkill[] = [
  { id: "ready_position", label: "Ready position", category: "fielding", subcategories: ["Ready position"], parentCue: "Knees bent, glove out, every pitch." },
  { id: "ground_balls", label: "Ground balls", category: "fielding", subcategories: ["Ground balls", "Glove positioning", "Footwork", "Infield fundamentals", "Transfers"], parentCue: "Feet wide, glove out front, watch it in." },
  { id: "fly_balls", label: "Fly balls", category: "fielding", subcategories: ["Fly balls", "Outfield fundamentals"], parentCue: "Get under it, two hands, call it loud." },
  { id: "throwing_motion", label: "Throwing motion", category: "throwing", subcategories: ["Throwing fundamentals", "Baseball grip", "Footwork", "Safe arm care"], parentCue: "Point, step, throw. Elbow up." },
  { id: "throwing_accuracy", label: "Throwing accuracy", category: "throwing", subcategories: ["Accuracy", "Playing catch", "Throwing progression"], parentCue: "Pick a target. Step at it." },
  { id: "contact", label: "Hitting contact", category: "hitting", subcategories: ["Contact", "Tee drills", "Timing", "Grip", "Stance"], parentCue: "Eyes on the ball through contact." },
  { id: "swing_mechanics", label: "Swing mechanics", category: "hitting", subcategories: ["Swing mechanics", "Load", "Balance", "Bat control"], parentCue: "Short to the ball, finish balanced." },
  { id: "running_bases", label: "Baserunning", category: "baserunning", subcategories: [], parentCue: "Run through first. Listen to the coach." },
  { id: "game_awareness", label: "Game awareness", category: "positions", subcategories: [], parentCue: "Know where the play is before the pitch." },
  { id: "effort_attitude", label: "Effort and attitude", category: "mental", subcategories: [], parentCue: "Next pitch. Cheer for a teammate." },
];
export const RATING_LABEL: Record<SkillRating, string> = { 1: "Not yet", 2: "Developing", 3: "Consistent" };
export const RATING_KEY: Record<string, SkillRating> = { not_yet: 1, developing: 2, consistent: 3 };

/** Lessons that address a skill for this age group, unfinished first, easiest first for a low rating. */
export function recommendLessons(skillId: string, ageGroup: AgeGroupId, lessons: Lesson[], completedIds: Set<string>, rating: SkillRating = 1, limit = 3): Lesson[] {
  const sk = REPORT_SKILLS.find((s) => s.id === skillId); if (!sk) return [];
  const match = lessons.filter((l) => l.category === sk.category && (sk.subcategories.length === 0 || sk.subcategories.includes(l.subcategory)) && l.ageGroups.includes(ageGroup) && (l.status ?? "published") === "published");
  const levelRank = (l: Lesson) => (l.skillLevel === "beginner" ? 0 : l.skillLevel === "intermediate" ? 1 : 2);
  const preferred = rating === 1 ? 0 : rating === 2 ? 1 : 2;
  return match.sort((a, b) => Number(completedIds.has(a.id)) - Number(completedIds.has(b.id)) || Math.abs(levelRank(a) - preferred) - Math.abs(levelRank(b) - preferred) || a.id.localeCompare(b.id)).slice(0, limit);
}
/** Pre-fills a report card from the newest skill checklist a coach saved in practice notes. */
export function ratingsFromNotes(notes: PlayerNote[]): Record<string, SkillRating> {
  const latest = [...notes].filter((n) => n.skillChecklist).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const out: Record<string, SkillRating> = {}; if (!latest?.skillChecklist) return out;
  for (const [k, v] of Object.entries(latest.skillChecklist)) if (RATING_KEY[v]) out[k] = RATING_KEY[v];
  return out;
}
export function cardSummary(card: Pick<ReportCard, "ratings">) {
  const rated = Object.entries(card.ratings); const strengths = rated.filter(([, v]) => v === 3).map(([k]) => k); const growing = rated.filter(([, v]) => v === 2).map(([k]) => k); const notYet = rated.filter(([, v]) => v === 1).map(([k]) => k);
  const avg = rated.length ? rated.reduce((a, [, v]) => a + v, 0) / rated.length : 0;
  return { strengths, growing, notYet, average: Math.round(avg * 100) / 100, rated: rated.length };
}
/** Skill-by-skill change between two cards (end of season vs mid-season). */
export function cardDeltas(prev: ReportCard | undefined, cur: ReportCard): { skillId: string; from: SkillRating | null; to: SkillRating; change: number }[] {
  return REPORT_SKILLS.filter((s) => cur.ratings[s.id]).map((s) => { const to = cur.ratings[s.id]; const from = prev?.ratings[s.id] ?? null; return { skillId: s.id, from, to, change: from ? to - from : 0 }; });
}
export function skillLabel(id: string) { return REPORT_SKILLS.find((s) => s.id === id)?.label ?? id.replace(/_/g, " "); }
