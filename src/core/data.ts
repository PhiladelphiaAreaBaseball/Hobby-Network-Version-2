import type { ContentBundle, DemoBundle } from "./types";
import { shiftDemo } from "./demoShift";
import { safeLocalGet } from "./util";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json() as Promise<T>;
}
const CONTENT_FILES = {
  lessons: ["lessons-hitting.json", "lessons-fielding.json", "lessons-throwing.json", "lessons-baserunning.json", "lessons-positions-mental.json"],
  drills: ["drills-hitting.json", "drills-fielding.json", "drills-throwing.json", "drills-baserunning.json", "drills-general.json", "drills-positions-mental.json"],
  drillVideos: ["drill-videos.json"], parentGuides: ["parent-guides.json"], coachPlans: ["coach-plans.json"], iqLessons: ["iq-lessons.json"], iqQuestions: ["iq-questions.json"], curricula: ["curricula.json"], challenges: ["challenges.json"], resources: ["resources.json"], glossary: ["glossary.json"], certification: ["certification.json"],
};
async function loadMany<T>(files: string[]): Promise<{ items: T[]; extra: any }> {
  const results = await Promise.allSettled(files.map((f) => getJson<{ items: T[]; badges?: any[] }>(`data/content/${f}`)));
  const items: T[] = []; let extra: any = {};
  for (const r of results) { if (r.status === "fulfilled") { items.push(...(r.value.items ?? [])); if ((r.value as any).badges) extra.badges = (r.value as any).badges; if ((r.value as any).passingScorePct) extra.passingScorePct = (r.value as any).passingScorePct; } else console.warn("content file missing", r.reason?.message); }
  return { items, extra };
}
export async function loadContent(): Promise<ContentBundle> {
  const [lessons, drills, parentGuides, coachPlans, iqLessons, iqQuestions, curricula, challenges, resources, glossary, manifest, drillVideos, certification, demoGuide, safety, seasonClose, surveys] = await Promise.all([
    loadMany<any>(CONTENT_FILES.lessons), loadMany<any>(CONTENT_FILES.drills), loadMany<any>(CONTENT_FILES.parentGuides), loadMany<any>(CONTENT_FILES.coachPlans), loadMany<any>(CONTENT_FILES.iqLessons),
    loadMany<any>(CONTENT_FILES.iqQuestions), loadMany<any>(CONTENT_FILES.curricula), loadMany<any>(CONTENT_FILES.challenges), loadMany<any>(CONTENT_FILES.resources), loadMany<any>(CONTENT_FILES.glossary), getJson<any>("data/content/manifest.json"), loadMany<any>(CONTENT_FILES.drillVideos), loadMany<any>(CONTENT_FILES.certification), getJson<any>("data/content/demo-guide.json").catch(() => null), getJson<any>("data/content/safety.json"), getJson<any>("data/content/season-close.json"), getJson<any>("data/content/surveys.json"),
  ]);
  return { lessons: lessons.items, drills: drills.items, drillVideos: drillVideos.items.map((v: any) => ({ ...v, id: v.id ?? v.drillId })), parentGuides: parentGuides.items, coachPlans: coachPlans.items, iqLessons: iqLessons.items, iqQuestions: iqQuestions.items, curricula: curricula.items, challenges: challenges.items, badges: challenges.extra.badges ?? [], resources: resources.items, glossary: glossary.items, certModules: certification.items, certPassingPct: certification.extra.passingScorePct ?? 80, demoGuide: demoGuide && demoGuide.acts ? demoGuide : null, safety: { planSections: safety.planSections, kitItems: safety.kitItems, incidentTypes: safety.incidentTypes }, seasonClose: { tasks: seasonClose.tasks, awardTemplates: seasonClose.awardTemplates }, surveyTemplates: surveys.templates, manifest: { ageGroups: manifest.ageGroups } };
}
/** Demo dates roll forward to today unless frozen (set localStorage gameplaniq:v1:freezeDates=1 to inspect the seed as generated). */
export async function loadDemo(): Promise<DemoBundle> { const raw = await getJson<DemoBundle>("data/demo/demo.json"); if (safeLocalGet("gameplaniq:v1:freezeDates") === "1") return raw; const today = new Date(); const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`; return shiftDemo(raw, iso).demo; }
