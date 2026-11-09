# Content Schema (authoritative for all educational content files)

All educational content lives in `data/content/*.json` as plain JSON. Nothing educational is hardcoded in UI components. Every file is an object: `{ "$schema": "<type>", "items": [ ... ] }`.

Writing rules for everyone producing content:

- Write real, specific, age-appropriate instruction. No generic filler, no repeated sentences across items. A volunteer parent who has never played baseball must be able to follow it.
- Safety first: no live hitting with hard baseballs indoors or in small spaces; tee ball and ages 4-8 default to soft/safety balls; respect arm care (no "throw as many as you can" drills). Never give medical, injury-diagnosis, or nutrition-prescription advice. Say "check your league's current Little League rulebook" wherever a rule may vary by division or year. Never claim platform content is the official rulebook.
- Videos do not exist yet. Every `video` must be `{ "status": "placeholder", "note": "<one sentence describing what the production video will show>" }`. Never invent a URL.
- Plain language. Short sentences. Define jargon the first time it is used ("the cutoff man, the infielder who stands between the outfielder and the base").
- Equipment-free alternatives must be genuinely workable (rolled-up sock ball, wall, tennis ball, shadow swings, chalk bases).
- IDs are stable, lowercase, hyphenated. Only reference IDs that exist in `manifest.json` or that you create in your own file.

## Shared enums

```ts
type AgeGroupId = 'a4_6' | 'a7_8' | 'a9_10' | 'a11_12' | 'a13_16';
type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
type Category = 'hitting' | 'throwing' | 'fielding' | 'baserunning' | 'positions' | 'baseball_iq' | 'mental';
type Equipment = 'none' | 'ball' | 'soft_ball' | 'tennis_ball' | 'glove' | 'bat' | 'tee' | 'helmet' | 'cones' | 'net' | 'bucket' | 'wall' | 'bases' | 'catcher_gear' | 'l_screen';
type Location = 'backyard' | 'driveway' | 'garage' | 'indoor_small' | 'park' | 'field';
type DrillPhase = 'warmup' | 'skill' | 'game' | 'cooldown';
type ThrowingLoad = 'none' | 'light' | 'moderate' | 'high';
type VideoRef = { status: 'placeholder'; note: string } | { status: 'linked'; url: string; durationSec: number; captions: boolean; transcript?: string; note: string };
```

## Lesson (`lessons-*.json`, `$schema: "lesson"`)

```ts
interface Lesson {
  id: string;                      // from manifest, e.g. "hit-01"
  title: string;                   // from manifest
  category: Category;
  subcategory: string;             // from manifest, e.g. "Grip"
  ageGroups: AgeGroupId[];         // from manifest
  skillLevel: SkillLevel;          // from manifest
  objective: string;               // one sentence: "The player will be able to ..."
  summary: string;                 // 1-2 sentences for cards and search results
  video: VideoRef;
  explanation: string[];           // 3-6 paragraphs of written instruction (each 2-5 sentences)
  parentInstructions: string[];    // 4-7 bullet instructions for the parent coaching this at home
  equipment: Equipment[];          // minimal required equipment
  equipmentFreeAlternative: string | null;  // how to practice with nothing, or null if truly impossible (rare)
  steps: string[];                 // 5-9 step-by-step drill instructions
  durationMin: number;             // 5-20
  commonMistakes: { mistake: string; fix: string }[];   // 3-5
  cues: string[];                  // 3-6 short coaching cues ("Nose over toes")
  safety: string[];                // 2-4 concrete notes
  progression: { easier: string; harder: string; nextLessonId: string | null };
  tags: string[];                  // 6-12 search terms incl. plain-language parent phrases ("afraid of the ball", "throws sidearm")
  drillIds: string[];              // drills you define in your drills file for this lesson (1-3)
}
```

## Drill (`drills-*.json`, `$schema: "drill"`)

Drills power the Home Practice Generator and the Coach Practice Planner, so metadata must be accurate.

```ts
interface Drill {
  id: string;                      // "drill-hit-01" (prefix by category)
  name: string;
  category: Category;
  skillFocus: string[];            // 1-3 from: grip, stance, balance, load, swing_path, contact, timing, bat_control, situational_hitting, throwing_grip, throwing_motion, footwork, accuracy, playing_catch, arm_care, ready_position, ground_balls, glove_work, transfers, fly_balls, infield, outfield, communication, running_bases, sliding, tagging_up, reading_ball, baseball_iq, confidence, teamwork, warmup, cooldown, fun
  ageGroups: AgeGroupId[];
  skillLevels: SkillLevel[];
  equipmentRequired: Equipment[];  // smallest set that works; ['none'] if nothing
  equipmentFreeVariant: string | null;  // how to run it with nothing at all
  locations: Location[];           // every location where it is SAFE. garage/indoor_small only for no-bat or soft-ball, no-throwing-hard drills
  minSpaceFt: number;              // e.g. 10, 20, 40, 90
  participantsMin: number;         // 1 = child alone, 2 = parent + child
  participantsMax: number;
  contexts: ('home' | 'team')[];   // home practice, team practice, or both
  durationMin: number;             // typical block length, 3-15
  phase: DrillPhase;
  intensity: 'low' | 'medium' | 'high';
  throwingLoad: ThrowingLoad;      // generator caps total throwing load per session
  setup: string;                   // 1-3 sentences
  instructions: string[];          // 3-7 steps
  reps: string;                    // "3 sets of 8 swings" or "10 rolled balls each side"
  cues: string[];                  // 2-4
  parentTip: string;               // what the adult should watch for
  safety: string[];                // 1-3
  funVariation: string;            // a game/challenge version
  lessonId: string | null;         // the lesson it belongs to
}
```

## Parent guide (`parent-guides.json`, `$schema: "parent_guide"`)

```ts
interface ParentGuide {
  id: string;                      // "pg-01"
  title: string;
  summary: string;
  category: Category | 'general';
  ageGroups: AgeGroupId[];
  pathwayStep: number | null;      // order in the "New to Baseball?" pathway (1..N) or null
  durationMin: number;
  video: VideoRef;
  intro: string[];                 // 1-3 short paragraphs, reassuring and plain
  whatToDo: string[];              // 5-8 exact instructions
  whatToSay: string[];             // 4-6 short phrases the parent can say verbatim
  whatToWatchFor: string[];        // 3-5 signs the child gets it
  whatToAvoid: string[];           // 3-5 mistakes inexperienced adults make
  ifStruggling: string[];          // 3-4 simpler versions
  makeItFun: string[];             // 2-3 games or challenges
  equipment: Equipment[];
  relatedLessonIds: string[];      // from manifest
  tags: string[];
}
```

## Coach practice plan (`coach-plans.json`, `$schema: "coach_plan"`)

```ts
interface CoachPlan {
  id: string;                      // "cp-01"
  title: string;
  ageGroups: AgeGroupId[];
  durationMin: number;             // total
  focus: string[];                 // skillFocus values
  playersMin: number; playersMax: number; coachesMin: number;
  equipment: Equipment[];
  space: 'small' | 'half_field' | 'full_field' | 'indoor';
  objective: string;
  blocks: {
    title: string; minutes: number;
    type: 'warmup' | 'station' | 'team' | 'game' | 'wrapup';
    description: string;           // 2-4 sentences
    setup: string;                 // equipment/cones/positions
    groups: string;                // "Three groups of four, rotate every 8 minutes"
    coachingPoints: string[];      // 2-4
  }[];                             // minutes must sum to durationMin
  safety: string[];
  progressions: string[];          // 2-3 ways to make it harder next week
  homeAssignmentLessonId: string | null;   // lesson to assign to parents after this practice
}
```

## Baseball IQ lesson (`iq-lessons.json`, `$schema: "iq_lesson"`)

```ts
interface IQLesson {
  id: string;                      // "iq-01"
  title: string;
  topic: 'positions' | 'rules' | 'force_plays' | 'cutoffs' | 'relays' | 'defense' | 'situations' | 'hitting' | 'baserunning';
  ageGroups: AgeGroupId[];
  summary: string;
  sections: { heading: string; body: string[]; diagram: DiagramSpec | null }[];   // 3-5 sections
  keyTakeaways: string[];          // 3-5
  questionIds: string[];           // iqq ids that belong to this lesson
}
type FieldSpot = 'P' | 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF' | 'home' | 'first' | 'second' | 'third' | 'mound' | 'LCgap' | 'RCgap' | 'shallowLF' | 'shallowRF' | 'deepCF' | 'cutoff1B' | 'cutoff3B' | 'bunt3B' | 'bunt1B';
interface DiagramSpec { highlight: FieldSpot[]; runners: ('first'|'second'|'third')[]; arrows: { from: FieldSpot; to: FieldSpot; kind: 'throw' | 'run' | 'move' }[]; caption: string }
```

## Baseball IQ question (`iq-questions.json`, `$schema: "iq_question"`)

```ts
interface IQQuestion {
  id: string;                      // "iqq-01" .. "iqq-50"
  type: 'diamond_select' | 'multiple_choice' | 'true_false' | 'position_identify';
  topic: IQLesson['topic'];
  lessonId: string;                // iq lesson id
  ageGroups: AgeGroupId[];
  difficulty: 1 | 2 | 3;
  scenario: { outs: 0|1|2; runners: ('first'|'second'|'third')[]; youAre: FieldSpot | null; ballTo: FieldSpot | null; ballType: 'ground' | 'fly' | 'line' | 'bunt' | null; inning?: string; score?: string } | null;
  prompt: string;
  assumptions: string | null;      // state when the answer depends on things not shown ("Assume an average runner and a routine ground ball")
  // diamond_select and position_identify: the player taps a FieldSpot. List every spot that is correct, acceptable, or a common wrong answer.
  targets: { spot: FieldSpot; verdict: 'correct' | 'acceptable' | 'wrong'; explanation: string }[] | null;
  // multiple_choice and true_false:
  options: { id: 'a'|'b'|'c'|'d'; text: string; verdict: 'correct' | 'acceptable' | 'wrong'; explanation: string }[] | null;
  explanation: string;             // the full teaching explanation shown after answering, 2-4 sentences
  animation: { throws: { from: FieldSpot; to: FieldSpot }[]; runs: { from: FieldSpot; to: FieldSpot }[] } | null;
  tags: string[];
}
```

Position_identify prompts look like "Tap the shortstop." with targets on positions. Diamond_select prompts look like "You are the shortstop. Runner on first, no outs, ground ball to you. Where do you throw?" Exactly one target must be `correct`; mark genuinely defensible alternatives `acceptable` and explain why.

## Curriculum (`curricula.json`, `$schema: "curriculum"`)

```ts
interface Curriculum {
  id: string;                      // "cur-beginner-12", "cur-intermediate-12"
  title: string;
  level: SkillLevel;
  ageGroups: AgeGroupId[];
  weeksCount: 8 | 12;
  summary: string;
  audience: string;                // who it is for, in plain words
  weeks: {
    week: number; title: string; focus: string;   // focus = skillFocus value(s) joined with " + "
    summary: string;               // 2-3 sentences
    lessonIds: string[];           // 1-3 lesson ids from manifest
    parentGuideIds: string[];      // 1-2
    homePracticeMinutes: number;   // 10-20
    iqQuestionIds: string[];       // 2-4 iqq ids (see manifest for topic ranges)
    challengeId: string | null;    // from challenges.json
    coachTip: string;              // one sentence for the team coach
  }[];
}
```

## Challenge + Badge (`challenges.json`, `$schema: "challenge"`, items are challenges; also a `badges` array at the top level)

```ts
interface Challenge {
  id: string;                      // "ch-01"
  title: string; description: string;
  rule: { type: 'lessons_completed' | 'practices_completed' | 'iq_correct' | 'curriculum_week_completed' | 'parent_child_practice' | 'lessons_in_category' | 'positions_identified' | 'sportsmanship_lesson'; target: number; category: Category | null; periodDays: number | null };
  badgeId: string;
  ageGroups: AgeGroupId[];
  points: number;                  // 10-100, rewards effort/learning, never volume of throws
}
interface Badge { id: string; name: string; description: string; icon: 'glove' | 'bat' | 'ball' | 'diamond' | 'star' | 'shield' | 'trophy' | 'book' | 'heart' | 'target' | 'lightning' | 'sun'; tier: 'bronze' | 'silver' | 'gold' }
```

## Resource article (`resources.json`, `$schema: "resource"`)

```ts
interface Resource {
  id: string; title: string;
  category: 'rules' | 'parent_guides' | 'coach_guides' | 'terminology' | 'player_safety' | 'concussion' | 'throwing_safety' | 'pitch_count' | 'sportsmanship' | 'nutrition' | 'hydration' | 'heat_safety' | 'volunteers' | 'league_documents';
  audience: ('parent' | 'coach' | 'player' | 'admin' | 'umpire' | 'volunteer')[];
  summary: string;
  body: string[];                  // 3-6 paragraphs
  checklist: string[];             // 0-6 actionable items
  officialLinks: { label: string; url: string }[];   // only real, well-known official URLs (e.g. https://www.littleleague.org, https://www.cdc.gov/heads-up). Leave [] if unsure.
  disclaimer: string | null;       // e.g. "This summary is not the official rulebook."
}
```

## Glossary (`glossary.json`, `$schema: "glossary_term"`)

```ts
interface GlossaryTerm { id: string; term: string; definition: string; example: string; relatedLessonIds: string[] }
```

## Drill video (`drill-videos.json`, `$schema: "drill_video"`)

One verified YouTube demonstration per drill. Authored with `scripts/merge-drill-videos.mjs` from researched part files; every entry is checked against YouTube's oEmbed endpoint before it is recorded, and the validator rejects malformed ids or duplicates.

```ts
interface DrillVideo { drillId: string; url: string; videoId: string; title: string; channel: string; note: string; verifiedAt: string }
```
