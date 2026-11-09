/* Home practice generator: assembles a safe, age-appropriate plan from the curated drill database. Rule-based by design:
   it never invents activities. Every selection is filtered by age, level, equipment, location safety, space, participants
   and a per-session throwing-load cap. */
import type { AgeGroupId, Category, Drill, Equipment, GeneratedBlock, Lesson, Location, SkillLevel } from "../core/types";

export type EquipmentOption = "none" | "ball" | "ball_glove" | "bat_ball" | "bat_ball_tee" | "full";
export interface HomePracticeParams { ageGroup: AgeGroupId; level: SkillLevel; focus: Category | "mixed"; skillFocus?: string | null; minutes: 5 | 10 | 15 | 20 | 30; equipment: EquipmentOption; location: Location; participants: 1 | 2 | 3; seed?: number; lessonId?: string | null; }
export interface GeneratedPlan { title: string; blocks: GeneratedBlock[]; totalMinutes: number; safety: string[]; funChallenge: string; recap: string; primaryLessonId: string | null; notes: string[]; }

export const EQUIPMENT_OPTIONS: { id: EquipmentOption; label: string; items: Equipment[] }[] = [
  { id: "none", label: "No equipment", items: ["none"] },
  { id: "ball", label: "Baseball only", items: ["none", "ball", "soft_ball", "tennis_ball"] },
  { id: "ball_glove", label: "Baseball and glove", items: ["none", "ball", "soft_ball", "tennis_ball", "glove"] },
  { id: "bat_ball", label: "Bat and baseball", items: ["none", "ball", "soft_ball", "tennis_ball", "bat", "glove"] },
  { id: "bat_ball_tee", label: "Bat, baseball, and tee", items: ["none", "ball", "soft_ball", "tennis_ball", "bat", "glove", "tee"] },
  { id: "full", label: "Additional equipment available", items: ["none", "ball", "soft_ball", "tennis_ball", "bat", "glove", "tee", "helmet", "cones", "net", "bucket", "wall", "bases", "l_screen"] },
];
export const LOCATIONS: { id: Location; label: string; spaceFt: number; hint: string }[] = [
  { id: "backyard", label: "Backyard", spaceFt: 50, hint: "Soft balls near windows and neighbors" },
  { id: "driveway", label: "Driveway", spaceFt: 40, hint: "Watch for cars; tennis balls bounce true on pavement" },
  { id: "garage", label: "Garage", spaceFt: 20, hint: "No full swings at a ball unless it is a soft ball into a net" },
  { id: "indoor_small", label: "Small indoor space", spaceFt: 12, hint: "Sock balls, grip, stance and footwork only" },
  { id: "park", label: "Local park", spaceFt: 150, hint: "Room to throw and run; set a bat zone" },
  { id: "field", label: "Baseball field", spaceFt: 300, hint: "Everything is on the table, including live hitting with a helmet" },
];
const LOAD_POINTS: Record<Drill["throwingLoad"], number> = { none: 0, light: 1, moderate: 2, high: 3 };
const LOAD_CAP: Record<AgeGroupId, number> = { a4_6: 2, a7_8: 3, a9_10: 4, a11_12: 5, a13_16: 6 };
const ADJACENT: Record<AgeGroupId, AgeGroupId[]> = { a4_6: ["a7_8"], a7_8: ["a4_6", "a9_10"], a9_10: ["a7_8", "a11_12"], a11_12: ["a9_10", "a13_16"], a13_16: ["a11_12"] };
const LEVEL_ORDER: SkillLevel[] = ["beginner", "intermediate", "advanced"];

function rng(seed: number) { let x = seed || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
function equipmentOk(d: Drill, avail: Set<Equipment>, loc: Location): { ok: boolean; useVariant: boolean } {
  const missing = d.equipmentRequired.filter((e) => e !== "none" && !avail.has(e) && !(e === "wall" && (loc === "garage" || loc === "driveway" || loc === "indoor_small")));
  if (missing.length === 0) return { ok: true, useVariant: false };
  if (d.equipmentFreeVariant) return { ok: true, useVariant: true };
  return { ok: false, useVariant: false };
}
export function feasibleDrills(drills: Drill[], p: HomePracticeParams, relax: 0 | 1 | 2 = 0): { drill: Drill; useVariant: boolean }[] {
  const avail = new Set(EQUIPMENT_OPTIONS.find((o) => o.id === p.equipment)!.items);
  const loc = LOCATIONS.find((l) => l.id === p.location)!;
  const ages = new Set<AgeGroupId>([p.ageGroup, ...(relax >= 1 ? ADJACENT[p.ageGroup] : [])]);
  const li = LEVEL_ORDER.indexOf(p.level); const levels = new Set<SkillLevel>([p.level, ...(relax >= 1 ? LEVEL_ORDER.filter((_, i) => Math.abs(i - li) === 1) : []), ...(relax >= 2 ? LEVEL_ORDER : [])]);
  const out: { drill: Drill; useVariant: boolean }[] = [];
  for (const d of drills) {
    if (!d.contexts.includes("home")) continue;
    if (!d.ageGroups.some((a) => ages.has(a))) continue;
    if (!d.skillLevels.some((l) => levels.has(l))) continue;
    if (!d.locations.includes(p.location)) continue; // safety: drills declare where they are safe
    if (d.minSpaceFt > loc.spaceFt) continue;
    if (d.participantsMin > p.participants) continue;
    const eq = equipmentOk(d, avail, p.location); if (!eq.ok) continue;
    out.push({ drill: d, useVariant: eq.useVariant });
  }
  return out;
}
function budget(minutes: HomePracticeParams["minutes"]) {
  switch (minutes) {
    case 5: return { warmup: 0, skill: 4, game: 0, recap: 1, skillDrills: 1 };
    case 10: return { warmup: 2, skill: 6, game: 0, recap: 2, skillDrills: 1 };
    case 15: return { warmup: 3, skill: 8, game: 3, recap: 1, skillDrills: 2 };
    case 20: return { warmup: 3, skill: 11, game: 4, recap: 2, skillDrills: 2 };
    default: return { warmup: 4, skill: 16, game: 6, recap: 4, skillDrills: 3 };
  }
}
export function generateHomePractice(drills: Drill[], lessons: Lesson[], p: HomePracticeParams): GeneratedPlan {
  const rand = rng(p.seed ?? 7); const notes: string[] = [];
  let pool = feasibleDrills(drills, p, 0); let relaxed = 0;
  if (pool.filter((x) => x.drill.phase === "skill").length < 2) { pool = feasibleDrills(drills, p, 1); relaxed = 1; }
  if (pool.filter((x) => x.drill.phase === "skill").length < 1) { pool = feasibleDrills(drills, p, 2); relaxed = 2; }
  if (relaxed) notes.push(relaxed === 1 ? "We widened the search to a neighboring age or skill level to fill this plan." : "Few drills match every choice. We included the closest safe matches.");
  const focusMatch = (d: Drill) => (p.focus === "mixed" ? 1 : d.category === p.focus ? 3 : 0) + (p.skillFocus && d.skillFocus.includes(p.skillFocus) ? 3 : 0) + (p.lessonId && d.lessonId === p.lessonId ? 6 : 0) + (d.skillLevels.includes(p.level) ? 1 : 0) + (d.ageGroups.includes(p.ageGroup) ? 1 : 0);
  const b = budget(p.minutes); const cap = LOAD_CAP[p.ageGroup]; let load = 0; const used = new Set<string>(); const focusSeen = new Set<string>();
  const pick = (phase: Drill["phase"] | "any", n: number) => {
    const cands = pool.filter((x) => !used.has(x.drill.id) && (phase === "any" ? x.drill.phase === "skill" : x.drill.phase === phase));
    const scored = cands.map((x) => ({ x, s: focusMatch(x.drill) + (x.drill.video ? 0.75 : 0) + rand() * 1.5 - (x.drill.skillFocus.some((f) => focusSeen.has(f)) ? 1.5 : 0) - (load + LOAD_POINTS[x.drill.throwingLoad] > cap ? 10 : 0) }));
    scored.sort((a, c) => c.s - a.s);
    const out: { drill: Drill; useVariant: boolean }[] = [];
    for (const { x } of scored) { if (out.length >= n) break; if (load + LOAD_POINTS[x.drill.throwingLoad] > cap) continue; out.push(x); used.add(x.drill.id); load += LOAD_POINTS[x.drill.throwingLoad]; x.drill.skillFocus.forEach((f) => focusSeen.add(f)); }
    return out;
  };
  const blocks: GeneratedBlock[] = [];
  const skill = pick("any", b.skillDrills);
  const primary = skill[0]?.drill ?? null; const lesson = primary?.lessonId ? lessons.find((l) => l.id === primary.lessonId) ?? null : null;
  if (b.warmup) {
    const w = pick("warmup", 1)[0];
    blocks.push(w ? toBlock(w, b.warmup, "warmup") : { phase: "warmup", title: "Shake-out warm-up", minutes: b.warmup, instructions: ["Jog or march in place for 30 seconds.", "Ten slow arm circles forward and back.", "Five gentle trunk twists each side.", "Two easy practice swings or tosses at half speed."], cues: ["Easy pace", "Breathe"], parentTip: "Warm-ups prevent the first throw or swing from being the hardest one." });
  }
  if (lesson) blocks.push({ phase: "skill", title: `Skill focus: ${lesson.title}`, minutes: 0, lessonId: lesson.id, instructions: [lesson.objective, ...lesson.cues.slice(0, 3).map((c) => `Cue: ${c}`)], cues: lesson.cues.slice(0, 4), parentTip: lesson.parentInstructions[0] });
  const per = Math.max(2, Math.floor(b.skill / Math.max(1, skill.length)));
  skill.forEach((s, i) => blocks.push(toBlock(s, i === skill.length - 1 ? b.skill - per * (skill.length - 1) : per, "skill")));
  if (skill.length === 0) blocks.push({ phase: "skill", title: "No matching drill", minutes: b.skill, instructions: ["Choose a different location or equipment option to find a safe drill for this skill."], cues: [] });
  let fun = "";
  if (b.game) { const g = pick("game", 1)[0]; if (g) { blocks.push(toBlock(g, b.game, "game")); fun = g.drill.funVariation || g.drill.name; } else if (primary) { blocks.push({ phase: "game", title: `Challenge: ${primary.name}`, minutes: b.game, drillId: primary.id, instructions: [primary.funVariation], cues: [] }); fun = primary.funVariation; } }
  if (!fun && primary) fun = primary.funVariation;
  const recapLines = ["Ask: what was the best thing you did today?", "Name one cue to remember next time.", "High five. Put the gear away together."];
  const cool = b.recap >= 3 ? pick("cooldown", 1)[0] : undefined;
  blocks.push(cool ? toBlock(cool, b.recap, "cooldown") : { phase: "cooldown", title: "Recap", minutes: b.recap, instructions: recapLines, cues: [] });
  const safety = uniqueLines([...(lesson?.safety ?? []), ...blocks.flatMap((x) => x.safety ?? []), ...locationSafety(p)]);
  const total = blocks.reduce((a, x) => a + x.minutes, 0);
  const title = `${p.minutes}-minute ${p.focus === "mixed" ? "all-around" : titleize(p.focus)} practice`;
  return { title, blocks, totalMinutes: total, safety, funChallenge: fun || "Finish with three perfect reps in a row.", recap: recapLines.join(" "), primaryLessonId: lesson?.id ?? null, notes };
}
function toBlock(x: { drill: Drill; useVariant: boolean }, minutes: number, phase: GeneratedBlock["phase"]): GeneratedBlock {
  const d = x.drill;
  return { phase, title: d.name, minutes, drillId: d.id, lessonId: d.lessonId ?? undefined, setup: x.useVariant ? `${d.setup} No-equipment version: ${d.equipmentFreeVariant}` : d.setup, instructions: d.instructions, cues: d.cues, parentTip: d.parentTip, reps: d.reps, safety: d.safety };
}
function locationSafety(p: HomePracticeParams): string[] {
  const out: string[] = [];
  if (p.location === "garage" || p.location === "indoor_small") out.push("Indoors: soft or sock balls only, no full swings at a pitched or tossed ball, and clear a radius around the player.");
  if (p.location === "driveway") out.push("Driveway: face away from the street and stop for every car.");
  if (p.ageGroup === "a4_6" || p.ageGroup === "a7_8") out.push("Young players: soft safety balls, short sessions, and stop while it is still fun.");
  if (p.equipment === "bat_ball" || p.equipment === "bat_ball_tee" || p.equipment === "full") out.push("Bat zone: nobody stands in front of or beside a swinging hitter. Helmet on for anything tossed or pitched.");
  return out;
}
const uniqueLines = (arr: string[]) => [...new Set(arr.filter(Boolean))];
const titleize = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
