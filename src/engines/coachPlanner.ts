/* Team practice planner for volunteer coaches. Builds a timed, station-based practice from team-context drills. */
import type { AgeGroupId, Drill, Equipment, GeneratedBlock, Lesson } from "../core/types";

export interface TeamPracticeParams { ageGroup: AgeGroupId; players: number; coaches: number; minutes: 45 | 60 | 75 | 90; space: "small" | "half_field" | "full_field" | "indoor"; equipment: Equipment[]; focus: string[]; seed?: number; }
export interface TeamPlan { title: string; blocks: GeneratedBlock[]; totalMinutes: number; safety: string[]; homeLessonId: string | null; summary: string; notes: string[]; }
const SPACE_FT: Record<TeamPracticeParams["space"], number> = { indoor: 20, small: 60, half_field: 150, full_field: 400 };
const LOAD: Record<Drill["throwingLoad"], number> = { none: 0, light: 1, moderate: 2, high: 3 };
function rng(seed: number) { let x = seed || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

export function feasibleTeamDrills(drills: Drill[], p: TeamPracticeParams) {
  const avail = new Set<Equipment>(["none", ...p.equipment]);
  return drills.filter((d) => d.contexts.includes("team") && d.ageGroups.includes(p.ageGroup) && d.minSpaceFt <= SPACE_FT[p.space]
    && (p.space !== "indoor" || d.locations.includes("indoor_small") || d.locations.includes("garage"))
    && d.equipmentRequired.every((e) => e === "none" || avail.has(e) || (e === "soft_ball" && avail.has("ball")) || (e === "tennis_ball" && avail.has("ball")) || (e === "bases" && avail.has("cones"))));
}
export function generateTeamPractice(drills: Drill[], lessons: Lesson[], p: TeamPracticeParams): TeamPlan {
  const rand = rng(p.seed ?? 11); const notes: string[] = [];
  let pool = feasibleTeamDrills(drills, p);
  if (pool.filter((d) => d.phase === "skill").length < 3) { pool = feasibleTeamDrills(drills, { ...p, equipment: [...p.equipment, "ball", "glove", "soft_ball", "tennis_ball", "cones"] }); notes.push("Some drills assume balls, gloves and cones are on hand."); }
  const score = (d: Drill) => d.skillFocus.filter((f) => p.focus.includes(f)).length * 3 + (p.focus.includes(d.category) ? 2 : 0) + (d.video ? 0.75 : 0) + rand();
  const used = new Set<string>(); const take = (pred: (d: Drill) => boolean, n: number) => { const c = pool.filter((d) => !used.has(d.id) && pred(d)).sort((a, b) => score(b) - score(a)).slice(0, n); c.forEach((d) => used.add(d.id)); return c; };
  const young = p.ageGroup === "a4_6" || p.ageGroup === "a7_8";
  const stations = p.coaches >= 3 ? 3 : p.coaches === 2 ? 2 : young ? 1 : 2; // one coach can run two self-managed stations with a buddy system at 9+
  const warm = young ? 8 : 12; const wrap = 5; const game = Math.round(p.minutes * (young ? 0.25 : 0.17)); const team = young ? 0 : Math.round(p.minutes * 0.2);
  const stationTotal = p.minutes - warm - wrap - game - team; const rotations = stations; const perStation = Math.max(6, Math.floor(stationTotal / rotations));
  const groupSize = Math.max(2, Math.ceil(p.players / stations));
  const blocks: GeneratedBlock[] = [];
  const dyn = take((d) => d.phase === "warmup" && d.skillFocus.includes("warmup"), 1)[0]; const throwWarm = take((d) => d.phase === "warmup" && (d.category === "throwing" || d.skillFocus.includes("playing_catch")), 1)[0];
  blocks.push({ phase: "warmup", title: "Dynamic warm-up and throwing progression", minutes: warm, setup: "Two lines facing each other, 15 feet apart to start, then back up to 30 and 45 feet.", groups: "Whole team", instructions: [...(dyn ? dyn.instructions.slice(0, 3) : ["High knees, butt kicks, skips and arm circles down a 40-foot line and back."]), ...(throwWarm ? throwWarm.instructions.slice(0, 3) : ["Play catch: start close with easy throws, back up every ten throws, finish with crow-hop throws."])], cues: [...(dyn?.cues ?? []), ...(throwWarm?.cues ?? [])].slice(0, 4), safety: ["Nobody throws before arm circles and easy catch.", "Count warm-up throws; keep young arms under 25 before drills."], drillId: throwWarm?.id });
  const stationDrills = take((d) => d.phase === "skill" && d.participantsMax >= Math.min(groupSize, 6), stations);
  let i = 0; for (const d of stationDrills) { i++; blocks.push({ phase: "station", title: `Station ${i}: ${d.name}`, minutes: perStation, drillId: d.id, lessonId: d.lessonId ?? undefined, setup: d.setup, groups: `${stations} groups of about ${groupSize}; rotate every ${perStation} minutes`, instructions: d.instructions, cues: d.cues, reps: d.reps, safety: d.safety, parentTip: d.parentTip }); }
  if (stationDrills.length < stations) { notes.push("Not enough matching station drills for this setup; combine groups at the stations listed."); }
  if (team) { const t = take((d) => d.phase === "skill" && (d.participantsMax >= p.players || d.skillFocus.includes("infield") || d.skillFocus.includes("outfield") || d.skillFocus.includes("baseball_iq")), 1)[0]; blocks.push(t ? { phase: "team", title: `Team segment: ${t.name}`, minutes: team, drillId: t.id, lessonId: t.lessonId ?? undefined, setup: t.setup, groups: "Whole team in positions; extra players run the bases", instructions: t.instructions, cues: t.cues, reps: t.reps, safety: t.safety } : { phase: "team", title: "Team segment: situations", minutes: team, groups: "Whole team", instructions: ["Coach hits or throws a ball to a fielder and calls a situation (runner on first, one out).", "Players make the play; coach asks the whole team where the throw should have gone.", "Rotate positions every three plays."], cues: ["Know the play before the pitch"] }); }
  const g = take((d) => d.phase === "game", 1)[0];
  blocks.push(g ? { phase: "game", title: `Finish with a game: ${g.name}`, minutes: game, drillId: g.id, setup: g.setup, groups: "Two teams", instructions: g.instructions, cues: g.cues, safety: g.safety } : { phase: "game", title: "Finish with a game: Execution Relay", minutes: game, groups: "Two teams", instructions: ["Teams line up at home. On go, the first player fields a rolled ball, throws to a coach at first, then runs through first base.", "A clean field, accurate throw and full-speed run scores three points.", "First team to 21 wins; losers lead the cheer for the winners."], cues: ["Fast feet, soft hands"] });
  const homeLesson = pickHomeLesson(lessons, stationDrills, p);
  blocks.push({ phase: "wrapup", title: "Wrap-up and home assignment", minutes: wrap, groups: "Whole team on one knee", instructions: ["Ask three players what they got better at today.", "Preview the next practice or game.", homeLesson ? `Assign at home: ${homeLesson.title} (one tap from your team page sends parents the lesson and a 10-minute practice).` : "Assign a lesson from the Academy for home practice."], cues: ["End on a win"] });
  const total = blocks.reduce((a, b) => a + b.minutes, 0);
  if (total !== p.minutes) blocks[blocks.length - 2].minutes += p.minutes - total;
  const load = [...stationDrills, g].filter(Boolean).reduce((a, d) => a + LOAD[d!.throwingLoad], 0);
  const safety = [...new Set(["Helmets on for every hitter, including tee and soft toss.", "Set a bat zone with cones; one hitter per zone.", load >= 5 ? "This plan is throwing-heavy. Keep young pitchers off the mound afterward and follow the league's pitch-count and rest rules." : "Count throws in warm-up and stations; stop at any arm pain.", ...blocks.flatMap((b) => b.safety ?? [])])];
  return { title: `${p.minutes}-minute practice · ${p.players} players · ${p.coaches} ${p.coaches === 1 ? "coach" : "coaches"}`, blocks, totalMinutes: blocks.reduce((a, b) => a + b.minutes, 0), safety, homeLessonId: homeLesson?.id ?? null, summary: `${stations} ${stations === 1 ? "station" : "stations"} of ${perStation} minutes${team ? `, a ${team}-minute team segment` : ""} and a ${game}-minute game.`, notes };
}
function pickHomeLesson(lessons: Lesson[], stationDrills: Drill[], p: TeamPracticeParams): Lesson | null {
  for (const d of stationDrills) if (d.lessonId) { const l = lessons.find((x) => x.id === d.lessonId); if (l) return l; }
  const byFocus = lessons.find((l) => l.ageGroups.includes(p.ageGroup) && p.focus.includes(l.category));
  return byFocus ?? null;
}
