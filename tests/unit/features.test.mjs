import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ratePlayers, rankPool, snakeOrder, onTheClock, availablePool, teamStrengths, balanceWarnings, autoPick } from "../../dist/test/engines/draft.mjs";
import { recommendLessons, ratingsFromNotes, cardSummary, cardDeltas, REPORT_SKILLS } from "../../dist/test/engines/reportCard.mjs";
import { autoRotation, lineupWarnings, advanceOut, addRun, scoreTotals, playingTime, fairnessNotes, DEFAULT_PLAY_RULES, BENCH, POSITIONS } from "../../dist/test/engines/gameDay.mjs";
const load = (f) => JSON.parse(readFileSync(`data/content/${f}`, "utf8")).items;
const lessons = ["lessons-hitting.json", "lessons-fielding.json", "lessons-throwing.json", "lessons-baserunning.json", "lessons-positions-mental.json"].flatMap(load);
const demo = JSON.parse(readFileSync("data/demo/demo.json", "utf8"));

test("draft: ratings average across evaluators and skills, snake order reverses every round", () => {
  const evals = [{ id: "1", leagueId: "x", tryoutId: "t", playerId: "a", evaluatorUserId: "u1", scores: { hitting: 4, fielding: 2 }, notes: "", updatedAt: "" }, { id: "2", leagueId: "x", tryoutId: "t", playerId: "a", evaluatorUserId: "u2", scores: { hitting: 2, fielding: 4, pitching: 5 }, notes: "", updatedAt: "" }, { id: "3", leagueId: "x", tryoutId: "t", playerId: "b", evaluatorUserId: "u1", scores: { hitting: 5 }, notes: "", updatedAt: "" }];
  const r = ratePlayers(evals); assert.equal(r.get("a").bySkill.hitting, 3); assert.equal(r.get("a").bySkill.fielding, 3); assert.equal(r.get("a").bySkill.pitching, 5); assert.equal(r.get("a").overall, 3.67); assert.equal(r.get("a").evaluators, 2); assert.equal(r.get("b").overall, 5);
  assert.deepEqual(rankPool(["a", "b", "c"], r, (id) => id), ["b", "a", "c"]);
  assert.deepEqual(snakeOrder(["t1", "t2", "t3"], 0), ["t1", "t2", "t3"]); assert.deepEqual(snakeOrder(["t1", "t2", "t3"], 1), ["t3", "t2", "t1"]);
  const draft = { id: "d", leagueId: "x", seasonId: "s", divisionId: "dv", title: "", status: "live", teamOrder: ["t1", "t2", "t3"], rounds: 2, picks: [], protectedPlayerIds: { t2: ["p9"] }, createdByUserId: "u", updatedAt: "" };
  assert.deepEqual(onTheClock(draft), { teamId: "t1", round: 1, pickInRound: 1, overall: 1 });
  draft.picks = [1, 2, 3].map((n) => ({ round: 1, pick: n, overall: n, teamId: draft.teamOrder[n - 1], playerId: `p${n}`, byUserId: "u", at: "" }));
  assert.deepEqual(onTheClock(draft), { teamId: "t3", round: 2, pickInRound: 1, overall: 4 }, "round two starts with the last team");
  assert.deepEqual(availablePool(["p1", "p2", "p3", "p4", "p9"], draft), ["p4"], "picked and protected players leave the pool");
  draft.picks.push(...[4, 5, 6].map((n) => ({ round: 2, pick: n - 3, overall: n, teamId: draft.teamOrder[6 - n], playerId: `p${n}`, byUserId: "u", at: "" })));
  assert.equal(onTheClock(draft), null, "no clock after the final round");
  assert.equal(autoPick(["a", "b"], r, (id) => id), "b");
});
test("draft: balance warnings flag a stacked team and a pitcher-less team without blocking", () => {
  const ratings = new Map([["s1", { playerId: "s1", overall: 4.8, bySkill: { pitching: 4 }, evaluators: 2, notes: [] }], ["s2", { playerId: "s2", overall: 4.6, bySkill: { pitching: 4 }, evaluators: 2, notes: [] }], ["s3", { playerId: "s3", overall: 4.7, bySkill: {}, evaluators: 2, notes: [] }], ["w1", { playerId: "w1", overall: 2.1, bySkill: {}, evaluators: 2, notes: [] }], ["w2", { playerId: "w2", overall: 2.3, bySkill: {}, evaluators: 2, notes: [] }], ["w3", { playerId: "w3", overall: 2.0, bySkill: {}, evaluators: 2, notes: [] }], ["w4", { playerId: "w4", overall: 2.2, bySkill: {}, evaluators: 2, notes: [] }]]);
  const draft = { teamOrder: ["A", "B"], rounds: 4, picks: [...["s1", "s2", "s3"].map((p, i) => ({ round: i + 1, pick: 1, overall: i * 2 + 1, teamId: "A", playerId: p, byUserId: "u", at: "" })), ...["w1", "w2", "w3", "w4"].map((p, i) => ({ round: i + 1, pick: 2, overall: i * 2 + 2, teamId: "B", playerId: p, byUserId: "u", at: "" }))], protectedPlayerIds: {} };
  const st = teamStrengths(draft, ratings, () => ({ leagueAge: 10 }), 10); const w = balanceWarnings(st, (id) => id, 1);
  assert.ok(w.some((x) => x.startsWith("A averages")), w.join(" | ")); assert.ok(w.some((x) => x.includes("B has no player rated 3 or better at pitching")), w.join(" | "));
});
test("report cards: recommendations match skill, age and unfinished lessons; checklist pre-fills ratings", () => {
  const recs = recommendLessons("ground_balls", "a9_10", lessons, new Set(["fld-02"]), 1, 3);
  assert.equal(recs.length, 3); for (const l of recs) { assert.equal(l.category, "fielding"); assert.ok(l.ageGroups.includes("a9_10")); } assert.notEqual(recs[0].id, "fld-02", "completed lesson is not first");
  const hit = recommendLessons("contact", "a4_6", lessons, new Set(), 1, 2); assert.ok(hit.every((l) => l.category === "hitting" && l.skillLevel === "beginner"));
  assert.deepEqual(recommendLessons("nope", "a9_10", lessons, new Set()), []);
  const ratings = ratingsFromNotes([{ id: "n1", createdAt: "2026-01-01T00:00:00", skillChecklist: { ground_balls: "not_yet", contact: "consistent" } }, { id: "n2", createdAt: "2026-02-01T00:00:00", skillChecklist: { ground_balls: "developing" } }]);
  assert.deepEqual(ratings, { ground_balls: 2 }, "newest checklist wins");
  const sum = cardSummary({ ratings: { a: 3, b: 3, c: 1, d: 2 } }); assert.deepEqual(sum.strengths, ["a", "b"]); assert.deepEqual(sum.notYet, ["c"]); assert.equal(sum.average, 2.25);
  const d = cardDeltas({ ratings: { ready_position: 1 } }, { ratings: { ready_position: 3, contact: 2 } }); assert.equal(d.find((x) => x.skillId === "ready_position").change, 2); assert.equal(d.find((x) => x.skillId === "contact").from, null);
  assert.ok(REPORT_SKILLS.length >= 8);
});
test("game day: auto rotation fields nine, spreads the bench, keeps the pitcher fixed; warnings enforce play rules", () => {
  const ids = Array.from({ length: 12 }, (_, i) => `p${i}`); const rot = autoRotation(ids, 6, { pitcherId: "p0", catcherId: "p1" });
  for (let inn = 0; inn < 6; inn++) { const onField = ids.map((id) => rot[id][inn]).filter((p) => p !== BENCH); assert.equal(onField.length, 9, `inning ${inn + 1} fields nine`); assert.equal(new Set(onField).size, 9, `inning ${inn + 1} has no duplicate positions`); assert.equal(rot.p0[inn], "P"); assert.equal(rot.p1[inn], "C"); }
  const benchCounts = ids.map((id) => rot[id].filter((p) => p === BENCH).length); assert.ok(Math.max(...benchCounts) - Math.min(...benchCounts.filter((_, i) => i > 1)) <= 1, `bench spread ${benchCounts}`);
  const roster = ids.map((id, i) => ({ id, firstName: `F${i}`, lastName: "L", positions: [] }));
  const ok = lineupWarnings({ order: ids, positions: rot, absent: [], updatedAt: "", byUserId: "" }, roster, 6, DEFAULT_PLAY_RULES); assert.deepEqual(ok.filter((w) => w.kind === "rule"), [], ok.map((w) => w.text).join(" | "));
  const bad = { ...rot, p5: [BENCH, BENCH, BENCH, BENCH, BENCH, "RF"] }; const w = lineupWarnings({ order: ids, positions: bad, absent: [], updatedAt: "", byUserId: "" }, roster, 6, DEFAULT_PLAY_RULES);
  assert.ok(w.some((x) => x.text.includes("plays only 1 defensive inning"))); assert.ok(w.some((x) => x.text.includes("sits 5 innings in a row")));
  const rest = lineupWarnings({ order: ids, positions: rot, absent: [], updatedAt: "", byUserId: "" }, roster, 6, DEFAULT_PLAY_RULES, (pid) => (pid === "p0" ? { eligibleToday: false, nextEligible: "2026-05-09" } : null)); assert.ok(rest.some((x) => x.kind === "safety" && x.text.includes("required rest")));
  const missing = lineupWarnings({ order: ids.slice(0, 10), positions: rot, absent: ["p11", "p10"], updatedAt: "", byUserId: "" }, roster, 6, DEFAULT_PLAY_RULES); assert.ok(missing.every((x) => !x.text.includes("not in the batting order")), "absent players are not required to bat");
  assert.equal(POSITIONS.length, 9);
});
test("game day: outs advance half innings, runs land on the current half, totals and playing time add up", () => {
  let s = { id: "g", leagueId: "x", eventId: "e", status: "live", innings: [{ top: null, bottom: null }], current: { inning: 1, half: "top", outs: 0 }, lineups: {}, pitchers: {}, updatedAt: "" };
  s = addRun(s, 1); s = addRun(s, 1); assert.equal(s.innings[0].top, 2); s = advanceOut(s); s = advanceOut(s); assert.equal(s.current.outs, 2); s = advanceOut(s); assert.deepEqual(s.current, { inning: 1, half: "bottom", outs: 0 });
  s = advanceOut(advanceOut(advanceOut(s))); assert.deepEqual(s.current, { inning: 2, half: "top", outs: 0 }); assert.equal(s.innings[0].bottom, 0, "a scoreless half is recorded as zero"); assert.equal(s.innings.length, 2);
  assert.deepEqual(scoreTotals([{ top: 2, bottom: 0 }, { top: 1, bottom: 4 }, { top: null, bottom: null }]), { away: 3, home: 4 });
  const sheets = demo.gameSheets.filter((g) => g.lineups.t09); assert.ok(sheets.length >= 2, "demo has finalized Comets game sheets");
  const roster = demo.players.filter((p) => p.teamId === "t09"); const pt = playingTime(sheets, "t09", roster); const played = pt.filter((r) => r.games > 0); assert.ok(played.length >= 10);
  for (const r of played) assert.equal(r.fieldInnings + r.benchInnings, r.games * 6, `${r.playerId} innings add up`);
  assert.ok(Array.isArray(fairnessNotes(pt, (id) => id)));
});
test("demo data: tryout pool, live draft and published report cards are consistent", () => {
  const tr = demo.tryouts.find((x) => x.id === "try_mn_next"); const pool = new Set(demo.registrations.filter((r) => r.seasonId === tr.seasonId && r.divisionId === tr.divisionId).map((r) => r.playerId));
  for (const e of demo.evaluations) { assert.equal(e.tryoutId, tr.id); assert.ok(pool.has(e.playerId), "every evaluation is for a registered player"); assert.ok(tr.evaluatorUserIds.includes(e.evaluatorUserId)); for (const v of Object.values(e.scores)) assert.ok(v >= 1 && v <= 5); }
  const d = demo.drafts.find((x) => x.id === "drf_mn_next"); assert.equal(d.status, "live"); assert.ok(d.picks.length >= d.teamOrder.length); const picked = d.picks.map((p) => p.playerId); assert.equal(new Set(picked).size, picked.length, "no player drafted twice"); for (const p of picked) assert.ok(pool.has(p));
  const protectedIds = Object.values(d.protectedPlayerIds).flat(); for (const p of protectedIds) assert.ok(!picked.includes(p), "protected players are never drafted");
  const jack = demo.players.find((p) => p.firstName === "Jack" && p.lastName === "Hill"); const rc = demo.reportCards.find((c) => c.playerId === jack.id); assert.equal(rc.status, "published"); assert.equal(rc.focusSkillId, "ground_balls"); assert.ok(rc.recommendedLessonIds.includes("fld-20"));
  for (const c of demo.reportCards) { assert.equal(demo.players.find((p) => p.id === c.playerId).teamId, c.teamId); for (const lid of c.recommendedLessonIds) assert.ok(lessons.some((l) => l.id === lid), lid); }
  const teamShifts = demo.shifts.filter((s) => s.teamId); assert.ok(teamShifts.length >= 12); for (const s of teamShifts) { const ev = demo.events.find((e) => e.id === s.eventId); assert.ok(ev.teamIds.includes(s.teamId)); }
});
