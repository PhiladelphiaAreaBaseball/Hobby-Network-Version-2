import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ratePlayers, rankPool, snakeOrder, onTheClock, availablePool, teamStrengths, balanceWarnings, autoPick } from "../../dist/test/engines/draft.mjs";
import { recommendLessons, ratingsFromNotes, cardSummary, cardDeltas, REPORT_SKILLS } from "../../dist/test/engines/reportCard.mjs";
import { gradeQuiz, personStatus, expiryFor } from "../../dist/test/engines/certification.mjs";
import { parseCsv, mapRows, detectColumns, normalizeDate } from "../../dist/test/engines/importer.mjs";
import { rolloverPreview, nextSeasonFor } from "../../dist/test/engines/season.mjs";
import { standings } from "../../dist/test/engines/standings.mjs";
import { deliverAtFor, wantsCategory, resolveLink, dedupeKey, familiesOfTeams, NOTIFY_RULES } from "../../dist/test/engines/notify.mjs";
import { familyCalendar, buildIcsItems } from "../../dist/test/engines/familyCalendar.mjs";
import { buildDigest, digestToText } from "../../dist/test/engines/digest.mjs";
import { allStarEligibility, isEligible, tally, ballotProblems, suggestedSelection } from "../../dist/test/engines/allstars.mjs";
import { shiftDateString, shiftDates, shiftDemo, daysBetween } from "../../dist/test/core/demoShift.mjs";
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
  const jack = demo.players.find((p) => p.firstName === "Player"); const rc = demo.reportCards.find((c) => c.playerId === jack.id); assert.equal(rc.status, "published"); assert.equal(rc.focusSkillId, "ground_balls"); assert.ok(rc.recommendedLessonIds.includes("fld-20"));
  for (const c of demo.reportCards) { assert.equal(demo.players.find((p) => p.id === c.playerId).teamId, c.teamId); for (const lid of c.recommendedLessonIds) assert.ok(lessons.some((l) => l.id === lid), lid); }
  const teamShifts = demo.shifts.filter((s) => s.teamId); assert.ok(teamShifts.length >= 12); for (const s of teamShifts) { const ev = demo.events.find((e) => e.id === s.eventId); assert.ok(ev.teamIds.includes(s.teamId)); }
});

test("certification: quizzes grade against the pass mark; status honours role audience, expiry and renewal window", () => {
  const cert = JSON.parse(readFileSync("data/content/certification.json", "utf8")); const mod = cert.items.find((m) => m.id === "cert-concussion");
  const right = Object.fromEntries(mod.quiz.map((q) => [q.id, q.correct])); const pass = gradeQuiz(mod, right, cert.passingScorePct); assert.equal(pass.pct, 100); assert.ok(pass.passed);
  const wrong = { ...right, [mod.quiz[0].id]: (mod.quiz[0].correct + 1) % mod.quiz[0].options.length, [mod.quiz[1].id]: null }; const fail = gradeQuiz(mod, wrong, cert.passingScorePct); assert.equal(fail.correct, mod.quiz.length - 2); assert.ok(!fail.passed); assert.equal(fail.perQuestion[1].chosen, null);
  assert.equal(expiryFor({ renewMonths: 12 }, "2026-01-15T10:00:00"), "2027-01-15");
  const today = "2026-11-08"; const recs = [{ id: "a", leagueId: "x", userId: "u", moduleId: "cert-abuse-awareness", completedAt: "2026-06-01T10:00:00", expiresAt: "2027-06-01", score: 100, passed: true, attempts: 1 }, { id: "b", leagueId: "x", userId: "u", moduleId: "cert-concussion", completedAt: "2025-12-15T10:00:00", expiresAt: "2026-12-15", score: 100, passed: true, attempts: 1 }, { id: "c", leagueId: "x", userId: "u", moduleId: "cert-first-aid", completedAt: "2024-01-01T10:00:00", expiresAt: "2026-01-01", score: 80, passed: true, attempts: 1 }, { id: "d", leagueId: "x", userId: "u", moduleId: "cert-pitching-rules", completedAt: "2026-10-01T10:00:00", expiresAt: "2027-10-01", score: 60, passed: false, attempts: 1 }];
  const coach = personStatus(cert.items, recs, "u", "head_coach", today); const by = Object.fromEntries(coach.modules.map((m) => [m.module.id, m.state]));
  assert.equal(by["cert-abuse-awareness"], "complete"); assert.equal(by["cert-concussion"], "expiring"); assert.equal(by["cert-first-aid"], "expired"); assert.equal(by["cert-pitching-rules"], "not_started", "a failed attempt does not count"); assert.equal(coach.requiredTotal, 5); assert.equal(coach.requiredDone, 2); assert.ok(!coach.complete);
  const vol = personStatus(cert.items, recs, "u", "volunteer", today); assert.ok(!vol.modules.some((m) => m.module.id === "cert-pitching-rules"), "volunteers are not asked for pitching rules"); assert.equal(vol.requiredTotal, 4);
  const other = personStatus(cert.items, recs, "someone-else", "head_coach", today); assert.equal(other.requiredDone, 0);
  for (const m of cert.items) assert.ok(m.quiz.length >= 3 && m.sections.length >= 3, m.id);
  assert.ok(demo.certifications.length > 30); const mark = demo.users.find((u) => u.firstName === "Head Coach"); const markSt = personStatus(cert.items, demo.certifications, mark.id, "head_coach", today); assert.equal(markSt.requiredDone, 4); assert.ok(!markSt.complete);
  const teamPlan = demo.practicePlans.find((p) => p.id === "plan_team_demo1"); assert.equal(teamPlan.blocks.reduce((a, b) => a + b.minutes, 0), teamPlan.totalMinutes);
});

test("importer: parses quoted CSV, detects column aliases, normalises dates and flags problems", () => {
  const rows = parseCsv('Player First,Player Last,DOB,Parent Email,"Parent Name",Division\r\n"Jordan","O\'Neil, Jr.",4/12/2017,sam@example.com,"Sam O\'Neil",Minor\nAlex,Rivera,2019-02-03,,,Coach pitch\nBad,Row,not a date,nope,,\n');
  assert.equal(rows.length, 4); assert.equal(rows[1][1], "O\'Neil, Jr.");
  const cols = detectColumns(rows[0]); assert.equal(cols.first, 0); assert.equal(cols.birthDate, 2); assert.equal(cols.guardianEmail, 3); assert.equal(cols.guardianFirst, 4); assert.equal(cols.division, 5);
  assert.equal(normalizeDate("4/12/2017"), "2017-04-12"); assert.equal(normalizeDate("2019-2-3"), "2019-02-03"); assert.equal(normalizeDate("12/01/09"), "2009-12-01"); assert.equal(normalizeDate("yesterday"), null);
  const divs = demo.divisions.filter((d) => d.leagueId === "lg_riverside"); const elig = demo.leagues[0].settings.eligibility;
  const { records } = mapRows(rows, divs, elig, { players: [], emails: new Set(["sam@example.com"]) });
  assert.equal(records.length, 3); assert.equal(records[0].first, "Jordan"); assert.equal(records[0].guardianFirst, "Sam"); assert.equal(records[0].guardianLast, "O\'Neil"); assert.equal(records[0].divisionId, "div_mn"); assert.ok(records[0].warnings.some((w) => w.includes("already has an account"))); assert.deepEqual(records[0].problems, []);
  assert.equal(records[1].divisionId, "div_rk"); assert.ok(records[1].warnings.some((w) => w.startsWith("No guardian email")));
  assert.ok(records[2].problems.some((p) => p.includes("not understood"))); assert.ok(records[2].problems.some((p) => p.includes("not valid")));
  const dup = mapRows([rows[0], rows[1], rows[1]], divs, elig, { players: [{ firstName: "Jordan", lastName: "O\'Neil, Jr.", birthDate: "2017-04-12" }], emails: new Set() }); assert.ok(dup.records[1].problems.includes("Duplicate of an earlier row.")); assert.ok(dup.records[0].warnings.some((w) => w.startsWith("Already in the league")));
  const single = mapRows([["Name", "Birthday", "Parent"], ["Casey Lee Park", "2016-06-06", "Robin Park"]], divs, elig, { players: [], emails: new Set() }); assert.equal(single.records[0].first, "Casey Lee"); assert.equal(single.records[0].last, "Park"); assert.equal(single.records[0].guardianFirst, "Robin");
});
test("season: rollover preview counts draft placements, carry-overs and age changes; standings honour the season", () => {
  const riverside = demo.leagues[0]; const from = demo.seasons.find((s) => s.id === "sea_fall"); const to = demo.seasons.find((s) => s.id === "sea_next"); const scope = (arr) => arr.filter((x) => x.leagueId === "lg_riverside");
  const pv = rolloverPreview({ from, to, teams: scope(demo.teams), divisions: scope(demo.divisions), players: scope(demo.players), registrations: scope(demo.registrations), drafts: [{ ...demo.drafts[0], status: "complete" }], eligibility: riverside.settings.eligibility });
  assert.equal(pv.teams, 20); assert.equal(pv.draftsToApply.length, 1); assert.equal(pv.placedByDraft, demo.drafts[0].picks.length + Object.values(demo.drafts[0].protectedPlayerIds).flat().length); assert.ok(pv.leaveTeam > 0); assert.ok(pv.keepTeam + pv.leaveTeam + pv.placedByDraft >= scope(demo.players).filter((p) => p.teamId).length - pv.placedByDraft);
  const live = rolloverPreview({ from, to, teams: [], divisions: [], players: [], registrations: [], drafts: [demo.drafts[0]], eligibility: riverside.settings.eligibility }); assert.ok(live.warnings.some((w) => w.includes("still live"))); assert.equal(live.draftsToApply.length, 0);
  assert.equal(nextSeasonFor(demo.seasons.filter((s) => s.leagueId === "lg_riverside"), from).id, "sea_next");
  const teams = [{ id: "a", divisionId: "d" }, { id: "b", divisionId: "d" }]; const evs = [{ id: "1", seasonId: "s1", type: "game", status: "completed", homeTeamId: "a", awayTeamId: "b", result: { homeScore: 5, awayScore: 3 }, teamIds: ["a", "b"] }, { id: "2", seasonId: "s2", type: "game", status: "completed", homeTeamId: "b", awayTeamId: "a", result: { homeScore: 9, awayScore: 0 }, teamIds: ["a", "b"] }];
  assert.equal(standings(teams, evs, "d", "s1")[0].teamId, "a"); assert.equal(standings(teams, evs, "d", "s2")[0].teamId, "b"); assert.equal(standings(teams, evs, "d")[0].wins, 1);
});

test("notification rules: quiet hours defer non-urgent kinds, preferences are honoured, links resolve to routes", () => {
  const comms = { allowCoachToParentDM: true, quietHoursStart: "21:00", quietHoursEnd: "07:00" };
  assert.equal(deliverAtFor("2026-05-01T22:15:00", comms, "message"), "2026-05-02T07:00:00", "late evening waits for morning"); assert.equal(deliverAtFor("2026-05-02T03:00:00", comms, "assignment"), "2026-05-02T07:00:00"); assert.equal(deliverAtFor("2026-05-01T12:00:00", comms, "message"), null); assert.equal(deliverAtFor("2026-05-01T22:15:00", comms, "schedule"), null, "rainouts are urgent");
  assert.equal(wantsCategory({ email: true, sms: false, push: true, digest: "immediate", categories: { messages: false } }, "message"), false); assert.equal(wantsCategory({ email: true, sms: false, push: true, digest: "immediate", categories: { schedule: false } }, "schedule"), true, "urgent kinds ignore the switch"); assert.equal(wantsCategory(undefined, "report"), true);
  assert.deepEqual(resolveLink("gameday-ev0302"), { name: "gameday", id: "ev0302", raw: "gameday-ev0302" }); assert.equal(resolveLink("coaches-team-t09").name, "coaches-team"); assert.equal(resolveLink("coaches-team-t09").id, "t09"); assert.equal(resolveLink(undefined).name, "home"); assert.equal(resolveLink("report-rc_p0097_mid").id, "rc_p0097_mid");
  assert.equal(dedupeKey("u1", "schedule", "event-e1"), "u1|schedule|event-e1"); assert.ok(NOTIFY_RULES.length >= 10);
  const fam = familiesOfTeams(["t09"], demo.players, demo.teams); const comets = demo.teams.find((t) => t.id === "t09"); assert.ok(fam.includes(comets.headCoachUserId)); assert.ok(fam.includes(demo.players.find((p) => p.firstName === "Player").guardianUserIds[0]));
});
test("family calendar: one feed with games, duties, deadlines and alarms; ICS is well formed", () => {
  const tyler = demo.users.find((u) => u.firstName === "Parent"); const kids = demo.players.filter((p) => p.guardianUserIds.includes(tyler.id)); const today = demo.seasons[0].startDate;
  const items = familyCalendar({ userId: tyler.id, children: kids, teams: demo.teams, coachTeamIds: [], events: demo.events, shifts: demo.shifts, assignments: demo.assignments, seasons: demo.seasons, tryouts: demo.tryouts, certifications: demo.certifications, eventTitle: (e) => `${e.awayTeamId} at ${e.homeTeamId}`, fieldName: (id) => id ?? "", teamName: (id) => id ?? "", isEvaluator: false, moduleTitle: (id) => id, fromDate: today });
  assert.ok(items.filter((i) => i.category === "game").length >= 10, "family games"); assert.ok(items.some((i) => i.category === "practice")); assert.ok(items.some((i) => i.category === "deadline" && i.allDay), "registration deadline is an all-day item");
  for (const i of items) if (i.category === "game") assert.ok(i.summary.startsWith("Game: ") && i.alarmMinutes === 120);
  const noAlarms = familyCalendar({ userId: tyler.id, children: kids, teams: demo.teams, coachTeamIds: [], events: demo.events, shifts: demo.shifts, assignments: demo.assignments, seasons: demo.seasons, tryouts: demo.tryouts, certifications: demo.certifications, eventTitle: () => "x", fieldName: () => "", teamName: () => "", isEvaluator: false, moduleTitle: (id) => id, fromDate: today }, { games: true, practices: false, duties: false, homePractice: false, deadlines: false, alarms: false }); assert.ok(noAlarms.every((i) => i.category === "game" || i.category === "event") && noAlarms.every((i) => !i.alarmMinutes));
  const ics = buildIcsItems(items.slice(0, 3), "Test"); assert.ok(ics.startsWith("BEGIN:VCALENDAR")); assert.ok(ics.includes("BEGIN:VALARM")); assert.ok(ics.includes("TRIGGER:-PT2H")); assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3); assert.ok(ics.endsWith("END:VCALENDAR"));
  const allDay = buildIcsItems([{ uid: "d", start: "2027-01-05", allDay: true, summary: "Deadline, with comma", category: "deadline", alarmMinutes: 1440 }], "T"); assert.ok(allDay.includes("DTSTART;VALUE=DATE:20270105")); assert.ok(allDay.includes("DTEND;VALUE=DATE:20270106")); assert.ok(allDay.includes("SUMMARY:Deadline\\, with comma")); assert.ok(allDay.includes("TRIGGER:-PT24H"));
});

test("digest: groups the week into sections, counts actions and renders text", () => {
  const items = [{ uid: "ev-e1", start: "2026-05-02T10:00:00", end: "2026-05-02T12:00:00", summary: "Game: Rockets at Comets", location: "Field 1", category: "game", alarmMinutes: 120 }, { uid: "ev-e2", start: "2026-05-04T17:30:00", end: "2026-05-04T19:00:00", summary: "Practice: Comets practice", category: "practice", alarmMinutes: 60 }, { uid: "duty-s1", start: "2026-05-02T10:00:00", end: "2026-05-02T12:00:00", summary: "Duty: Post-game snacks (Comets)", category: "duty", alarmMinutes: 1440 }, { uid: "asg-a1", start: "2026-04-30", allDay: true, summary: "Home practice due: Jack", category: "deadline", alarmMinutes: 1440 }, { uid: "reg-s", start: "2026-05-20", allDay: true, summary: "Registration closes: Spring", category: "deadline", alarmMinutes: 2880 }];
  const base = { today: "2026-05-01", items, notifications: [], unreadCount: 2, fieldsNotOpen: [{ name: "Field 1", status: "under_review", note: "Standing water" }], reportCards: [{ id: "rc1", status: "published", period: "mid", playerId: "p" }], coachTeams: [], nextGames: [], cardsToWrite: [], drafts: [], tryouts: [], userId: "u", isCoach: false, childrenNames: ["Jack"] };
  const week = buildDigest(base, "week"); const ids = week.sections.map((s) => s.id); assert.deepEqual(ids, ["fields", "schedule", "duties", "homework", "reports", "deadlines", "inbox"]); assert.equal(week.sections.find((s) => s.id === "schedule").lines.length, 2); assert.ok(week.sections.find((s) => s.id === "homework").lines[0].text.includes("overdue")); assert.equal(week.actionCount, 3); assert.match(week.headline, /3 things need you and 1 game this week/);
  const day = buildDigest(base, "today"); assert.ok(!day.sections.some((s) => s.id === "schedule"), "nothing on the field on May 1"); assert.ok(day.sections.some((s) => s.id === "homework"), "overdue homework still shows today");
  const quiet = buildDigest({ ...base, items: [], unreadCount: 0, fieldsNotOpen: [], reportCards: [] }, "today"); assert.equal(quiet.sections.length, 0); assert.match(quiet.headline, /Nothing scheduled today/);
  const coach = buildDigest({ ...base, isCoach: true, coachTeams: [{ id: "t1", name: "Comets" }], nextGames: [{ team: { id: "t1", name: "Comets" }, event: { id: "e1", start: "2026-05-02T10:00:00" }, hasLineup: false, openDuties: 2 }], cardsToWrite: [{ team: { id: "t1", name: "Comets" }, count: 3 }], drafts: [{ id: "d1", title: "Minor draft", status: "live", teamOrder: ["t1", "t2"], rounds: 2, picks: [], protectedPlayerIds: {} }] }, "week"); const coachSec = coach.sections.find((s) => s.id === "coach"); assert.ok(coachSec.lines.some((l) => l.text.includes("no lineup card"))); assert.ok(coachSec.lines.some((l) => l.text.includes("on the clock") && l.tone === "urgent"));
  const text = digestToText(week, "This week for the Hill family"); assert.ok(text.startsWith("# This week for the Hill family")); assert.ok(text.includes("## Your duties")); assert.ok(text.includes("Post-game snacks"));
});
test("all-stars: eligibility checks, ranked tally with tie-breaks, ballot rules and suggested selection", () => {
  const cfg = demo.leagues[0].settings.eligibility; const pool = { id: "pl", rosterSize: 3, ageMin: 11, ageMax: 12, divisionId: "div_mj", minGames: 2, maxOwnPlayersOnBallot: 1 };
  const player = { id: "a", birthDate: `${Number(cfg.ageDeterminationDate.slice(0, 4)) - 12}-01-01`, teamId: "t13", divisionId: "div_mj" }; const reg = { verification: { residency: "verified" } };
  const ok = allStarEligibility(player, pool, reg, cfg, 5); assert.ok(isEligible(ok)); const young = allStarEligibility({ ...player, birthDate: `${Number(cfg.ageDeterminationDate.slice(0, 4)) - 9}-01-01` }, pool, reg, cfg, 5); assert.ok(!isEligible(young)); assert.ok(!young.find((c) => c.id === "age").ok);
  const noReg = allStarEligibility(player, pool, undefined, cfg, null); assert.ok(!noReg.find((c) => c.id === "residency").ok); assert.ok(noReg.find((c) => c.id === "games").ok, "unknown attendance does not block");
  const noms = ["a", "b", "c", "d"].map((pid) => ({ id: pid, poolId: "pl", playerId: pid, teamId: "t", nominatedByUserId: "u", note: "", createdAt: "" })); noms.push({ id: "b2", poolId: "pl", playerId: "b", teamId: "t2", nominatedByUserId: "u2", note: "", createdAt: "" });
  const votes = [{ id: "v1", poolId: "pl", voterUserId: "u1", teamId: "t", playerIds: ["a", "b", "c"], updatedAt: "" }, { id: "v2", poolId: "pl", voterUserId: "u2", teamId: "t2", playerIds: ["b", "a", "d"], updatedAt: "" }, { id: "v3", poolId: "other", voterUserId: "u3", teamId: "t3", playerIds: ["d", "d", "d"], updatedAt: "" }];
  const rows = tally(pool, noms, votes); assert.deepEqual(rows.map((r) => r.playerId), ["b", "a", "c", "d"], "b wins the tie on first-place votes then nominations"); assert.equal(rows[0].points, 5); assert.equal(rows[1].points, 5); assert.equal(rows[0].firstPlace, 1); assert.equal(rows[0].nominations, 2); assert.equal(rows[3].ballots, 1, "ballots for another pool are ignored");
  assert.deepEqual(ballotProblems(pool, ["a", "b"], new Set(["a", "b", "c"]), new Set(["a", "b"])), ["At most 1 of your own players may be on your ballot (you listed 2)."]); assert.ok(ballotProblems(pool, ["a", "a"], new Set(["a"]), new Set()).includes("A player appears twice.")); assert.ok(ballotProblems(pool, ["z"], new Set(["a"]), new Set()).some((p) => p.includes("not nominated"))); assert.deepEqual(ballotProblems(pool, ["a"], new Set(["a"]), new Set()), []);
  const sug = suggestedSelection(rows, 2, new Set(["a", "c", "d"])); assert.deepEqual(sug.selected, ["a", "c"]); assert.deepEqual(sug.alternates, ["d"]);
  const mj = demo.allStarPools.find((p) => p.id === "asp_mj_1112"); assert.equal(mj.status, "voting"); const mjRows = tally(mj, demo.allStarNominations, demo.allStarVotes); assert.ok(mjRows.length >= 18); assert.ok(mjRows[0].points > 0);
});

test("demo dates shift forward by whole days while birth dates and the determination date stay fixed", () => {
  assert.equal(daysBetween("2026-11-08", "2026-11-20"), 12); assert.equal(shiftDateString("2026-11-08", 12), "2026-11-20"); assert.equal(shiftDateString("2026-11-28T17:30:00", 5), "2026-12-03T17:30:00"); assert.equal(shiftDateString("hello", 5), "hello"); assert.equal(shiftDateString("2026-11-08", 0), "2026-11-08");
  const out = shiftDates({ start: "2026-11-08T10:00:00", birthDate: "2017-04-12", nested: [{ dueBy: "2026-12-01", ageDeterminationDate: "2026-08-31" }], n: 3, since: 2019 }, 10);
  assert.equal(out.start, "2026-11-18T10:00:00"); assert.equal(out.birthDate, "2017-04-12"); assert.equal(out.nested[0].dueBy, "2026-12-11"); assert.equal(out.nested[0].ageDeterminationDate, "2026-08-31"); assert.equal(out.n, 3); assert.equal(out.since, 2019);
  assert.ok(demo.meta?.seededOn, "seed records its date"); const shifted = shiftDemo(demo, shiftDateString(demo.meta.seededOn, 7)); assert.equal(shifted.shiftedDays, 7); const ev0 = demo.events[0]; const ev1 = shifted.demo.events[0]; assert.equal(ev1.start, shiftDateString(ev0.start, 7)); assert.equal(shifted.demo.players[0].birthDate, demo.players[0].birthDate); assert.equal(shifted.demo.leagues[0].settings.eligibility.ageDeterminationDate, demo.leagues[0].settings.eligibility.ageDeterminationDate); assert.equal(shifted.demo.meta.shiftedDays, 7);
  const same = shiftDemo(demo, demo.meta.seededOn); assert.equal(same.shiftedDays, 0); assert.strictEqual(same.demo, demo, "no copy when nothing moves");
});

// ---- guided tour content: every stop opens a real route for a real persona
import { parseRoute } from "../../dist/test/core/router.mjs";
test("guided tour stops resolve to real routes, personas and demo records", () => {
  const tour = JSON.parse(readFileSync("data/content/tour.json", "utf8")); const demo = JSON.parse(readFileSync("data/demo/demo.json", "utf8")); const personas = new Set(demo.personas.map((p) => p.id));
  const stops = tour.sections.flatMap((s) => s.steps.map((st) => ({ ...st, persona: s.persona })));
  assert.ok(stops.length >= 40, "the tour should cover the whole app");
  for (const st of stops) {
    assert.ok(personas.has(st.persona), `${st.id}: persona ${st.persona}`);
    const r = parseRoute("#" + st.route); assert.ok(r.name !== "home" || st.route === "home", `${st.id}: route ${st.route} fell through to home`);
    if (r.name === "team") assert.ok(demo.teams.some((t) => t.id === r.id), `${st.id}: team ${r.id}`);
    if (r.name === "coaches-team") assert.ok(demo.teams.some((t) => t.id === r.id), `${st.id}: team ${r.id}`);
    if (r.name === "report") assert.ok(demo.reportCards.some((c) => c.id === r.id), `${st.id}: report ${r.id}`);
    if (r.name === "tryout") assert.ok(demo.tryouts.some((t) => t.id === r.id), `${st.id}: tryout ${r.id}`);
    if (r.name === "allstars") assert.ok(demo.allStarPools.some((p) => p.id === r.id), `${st.id}: pool ${r.id}`);
    if (r.name === "practice-plan") assert.ok(demo.practicePlans.some((p) => p.id === r.id), `${st.id}: plan ${r.id}`);
    if (r.name === "site") assert.ok(demo.leagues.some((l) => l.slug === r.id), `${st.id}: league slug ${r.id}`);
  }
  const sectionIds = tour.sections.map((s) => s.id); assert.equal(new Set(sectionIds).size, sectionIds.length);
  assert.ok(tour.sections.some((s) => s.persona === "persona_parent") && tour.sections.some((s) => s.persona === "persona_coach") && tour.sections.some((s) => s.persona === "persona_admin") && tour.sections.some((s) => s.persona === "persona_player") && tour.sections.some((s) => s.persona === "persona_platform"), "families, players, coaches, office and platform all covered");
});

// ---- tournaments
import { generate, applyResult, seedOrder, playable, poolStandings, roundRobinTable } from "../../dist/test/engines/tournament.mjs";
test("round robin: every pair plays once, odd counts get byes", () => {
  const { matches } = generate("round_robin", ["a", "b", "c", "d", "e"]); assert.equal(matches.length, 10);
  const pairs = new Set(matches.map((m) => [m.homeTeamId, m.awayTeamId].sort().join("-"))); assert.equal(pairs.size, 10);
  const t = { id: "t", format: "round_robin", teamIds: ["a", "b", "c", "d", "e"], pools: [], matches, status: "live" }; let x = t; for (const m of matches) x = applyResult(x, m.id, m.homeTeamId === "a" ? 5 : 1, m.awayTeamId === "a" ? 5 : 2); assert.equal(x.status, "complete"); assert.equal(x.championTeamId, "a"); assert.equal(roundRobinTable(x)[0].w, 4);
});
test("single elimination seeds 1 v 8 and resolves byes for six teams", () => {
  assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  const seeds = ["s1", "s2", "s3", "s4", "s5", "s6"]; const { matches } = generate("single_elim", seeds); const r1 = matches.filter((m) => m.round === 1); assert.equal(r1.length, 4); assert.equal(r1.filter((m) => m.bye).length, 2);
  const semis = matches.filter((m) => m.round === 2); assert.ok(semis.some((m) => m.homeTeamId === "s1" || m.awayTeamId === "s1"), "seed 1 is already in the semifinal after its bye");
  let t = { id: "t", format: "single_elim", teamIds: seeds, seeds, pools: [], matches, status: "live" }; const ready = playable(t); assert.equal(ready.length, 2);
  for (const m of ready) t = applyResult(t, m.id, 3, 1); const semi = playable(t); assert.equal(semi.length, 2); for (const m of semi) t = applyResult(t, m.id, 1, 2); const fin = playable(t); assert.equal(fin.length, 1); t = applyResult(t, fin[0].id, 4, 2); assert.equal(t.status, "complete"); assert.ok(t.championTeamId && t.runnerUpTeamId && t.championTeamId !== t.runnerUpTeamId);
});
test("double elimination: a team that loses once is still alive, twice is out", () => {
  const seeds = ["a", "b", "c", "d"]; let t = { id: "t", format: "double_elim", teamIds: seeds, seeds, pools: [], matches: generate("double_elim", seeds).matches, status: "live" };
  const w1 = t.matches.filter((m) => m.stage === "winners" && m.round === 1); assert.equal(w1.length, 2); for (const m of w1) t = applyResult(t, m.id, 2, 0); // a and c win (home)
  const l1 = t.matches.find((m) => m.stage === "losers" && m.round === 1); assert.ok(l1.homeTeamId && l1.awayTeamId, "both first-round losers meet in the losers bracket"); assert.deepEqual([l1.homeTeamId, l1.awayTeamId].sort(), ["c", "d"]);
  t = applyResult(t, l1.id, 1, 0); const wf = t.matches.find((m) => m.stage === "winners" && m.round === 2); t = applyResult(t, wf.id, 3, 2); const l2 = t.matches.find((m) => m.stage === "losers" && m.round === 2); assert.ok(l2.homeTeamId && l2.awayTeamId, "winner-bracket loser drops into the losers bracket"); t = applyResult(t, l2.id, 0, 1); const fin = t.matches.find((m) => m.stage === "final"); assert.ok(fin.homeTeamId && fin.awayTeamId); t = applyResult(t, fin.id, 5, 4); assert.equal(t.status, "complete");
});
test("pools then bracket seeds the bracket from pool standings", () => {
  const seeds = ["a", "b", "c", "d", "e", "f", "g", "h"]; let t = { id: "t", format: "pools_bracket", teamIds: seeds, seeds, status: "live", ...generate("pools_bracket", seeds, { poolCount: 2, advance: 2 }) }; assert.equal(t.pools.length, 2); assert.equal(t.pools[0].teamIds.length, 4);
  const pool = t.matches.filter((m) => m.stage === "pool"); assert.equal(pool.length, 12); for (const m of pool) t = applyResult(t, m.id, m.homeTeamId < m.awayTeamId ? 4 : 1, m.homeTeamId < m.awayTeamId ? 1 : 4); // alphabetical order wins
  const st = poolStandings(t, t.pools[0].id); assert.equal(st[0].w, 3); const semis = t.matches.filter((m) => m.stage !== "pool" && m.round === 1); assert.ok(semis.every((m) => m.homeTeamId && m.awayTeamId), "bracket filled from pool placings"); assert.ok(semis.some((m) => (m.homeTeamId === st[0].teamId && m.awayTeamId !== st[1].teamId) || (m.awayTeamId === st[0].teamId && m.homeTeamId !== st[1].teamId)), "pool winner does not meet its own runner-up");
});
// ---- team formation
import { formTeams } from "../../dist/test/engines/formation.mjs";
test("team formation keeps siblings and buddies together, honours coach requests, balances size", () => {
  const mk = (id, last, g, extra = {}) => ({ id, firstName: id, lastName: last, displayName: id, guardianUserIds: [g], leagueAge: 8, ...extra });
  const players = [mk("A", "Smith", "g1"), mk("B", "Smith", "g1"), mk("C", "Jones", "g2"), mk("D", "Lee", "g3"), mk("E", "Kim", "g4"), mk("F", "Diaz", "g5"), mk("G", "Wu", "g6"), mk("H", "Park", "g7"), mk("I", "Ortiz", "gcoach")];
  const teams = [{ id: "t1", name: "Hawks", headCoachUserId: "gcoach" }, { id: "t2", name: "Bears", headCoachUserId: "u2" }, { id: "t3", name: "Foxes", headCoachUserId: "u3" }];
  const ratings = new Map([["A", 5], ["B", 4.5], ["C", 4.8], ["D", 2], ["E", 2.2], ["F", 3], ["G", 3.1], ["H", 1.5], ["I", 3]]);
  const registrations = [{ playerId: "C", requests: { buddyName: "D Lee" } }, { playerId: "E", requests: { coachName: "Pat Bear" } }, { playerId: "H", requests: { buddyName: "Nobody Here" } }];
  const r = formTeams({ players, teams, ratings, registrations, coachNames: new Map([["t1", "Chris Ortiz"], ["t2", "Pat Bear"], ["t3", "Sam Fox"]]), coachKids: new Map([["t1", ["I"]]]) });
  assert.equal(r.assignments.get("A"), r.assignments.get("B"), "siblings together"); assert.equal(r.assignments.get("C"), r.assignments.get("D"), "buddies together"); assert.equal(r.assignments.get("E"), "t2", "coach request honoured"); assert.equal(r.assignments.get("I"), "t1", "coach's child on the coach's team");
  const sizes = r.teams.map((t) => t.size); assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `sizes even: ${sizes}`); assert.ok(r.unmet.some((u) => u.includes("Nobody Here")), "unmet buddy request reported"); assert.equal(r.assignments.size, 9);
});
// ---- forms
import { validateAnswers, summarize, expectedCount } from "../../dist/test/engines/forms.mjs";
test("forms validate required fields and summarize ratings, choices and yes/no", () => {
  const form = { id: "f", fields: [{ id: "r", type: "rating", label: "Effort", required: true }, { id: "c", type: "choice", label: "Role", options: ["A", "B"] }, { id: "y", type: "yes_no", label: "Ready" }, { id: "s", type: "signature", label: "Sign", required: true }, { id: "m", type: "multi", label: "Days", options: ["Mon", "Tue"] }] };
  assert.deepEqual(validateAnswers(form, {}).map((p) => p.fieldId), ["r", "s"]); assert.equal(validateAnswers(form, { r: 7, s: "Jo" }).length, 2, "rating out of range and one-word signature are rejected"); assert.equal(validateAnswers(form, { r: 4, s: "Jo Smith", c: "Z" }).length, 1, "choice must be an option"); assert.equal(validateAnswers(form, { r: 4, s: "Jo Smith", c: "A", y: true, m: ["Mon"] }).length, 0);
  const rs = [{ formId: "f", answers: { r: 5, c: "A", y: true, m: ["Mon", "Tue"] } }, { formId: "f", answers: { r: 3, c: "A", y: false, m: ["Tue"] } }, { formId: "g", answers: { r: 1 } }]; const st = summarize(form, rs); assert.equal(st.responses, 2); assert.equal(st.byField[0].avg, 4); assert.deepEqual(st.byField[0].dist, [0, 0, 1, 0, 1]); assert.deepEqual(st.byField[1].counts, { A: 2 }); assert.equal(st.byField[2].yes, 1); assert.deepEqual(st.byField[4].counts, { Mon: 1, Tue: 2 });
  assert.equal(expectedCount({ perPlayer: true, audience: "coach" }, { guardians: 10, coaches: 4, volunteers: 6, staff: 3, players: 50, rosteredPlayers: 40 }), 40); assert.equal(expectedCount({ perPlayer: false, audience: "guardian" }, { guardians: 10, coaches: 4, volunteers: 6, staff: 3, players: 50, rosteredPlayers: 40 }), 10);
});
// ---- payment plans
import { buildInstallments, overdueInstallments, dueSoon, planBalance, planStatusLabel } from "../../dist/test/engines/paymentPlans.mjs";
test("payment plans split cents onto the last installment and flag overdue", () => {
  const inst = buildInstallments(100, 3, "2026-01-15"); assert.deepEqual(inst.map((i) => i.amount), [33.33, 33.33, 33.34]); assert.deepEqual(inst.map((i) => i.dueDate), ["2026-01-15", "2026-02-15", "2026-03-15"]);
  const plan = { total: 100, status: "active", installments: [{ ...inst[0], paidAt: "2026-01-14T10:00:00" }, inst[1], inst[2]] }; assert.equal(planBalance(plan), 66.67); assert.equal(overdueInstallments(plan, "2026-03-01").length, 1); assert.equal(dueSoon(plan, "2026-03-10").length, 1); assert.equal(planStatusLabel(plan, "2026-03-01").label, "1 overdue"); assert.equal(planStatusLabel(plan, "2026-02-01").label, "On schedule"); assert.equal(planStatusLabel({ ...plan, status: "complete" }, "2026-03-01").label, "Paid in full");
});
// ---- curriculum compliance
import { compliance } from "../../dist/test/engines/curriculumCompliance.mjs";
test("curriculum compliance counts a week when a completed team practice or home assignment teaches its lesson", () => {
  const cur = { weeks: [{ week: 1, title: "W1", lessonIds: ["L1"] }, { week: 2, title: "W2", lessonIds: ["L2"] }, { week: 3, title: "W3", lessonIds: ["L3"] }] }; const tc = { teamId: "t1", startDate: "2026-03-02" };
  const plans = [{ teamId: "t1", completedAt: "2026-03-04T18:00:00", blocks: [{ drillId: "D1" }] }, { teamId: "t1", completedAt: "2026-03-18T18:00:00", blocks: [{ lessonId: "L9" }] }]; const assignments = [{ teamId: "t1", assignedAt: "2026-03-10T09:00:00", lessonId: "L2" }]; const drills = [{ id: "D1", lessonId: "L1" }];
  const s = compliance(tc, cur, plans, assignments, drills, "2026-03-20"); assert.equal(s.weeksElapsed, 3); assert.equal(s.weeksCovered, 2); assert.equal(s.currentWeek, 3); assert.equal(s.pct, 67); assert.ok(s.weeks[0].covered && s.weeks[1].covered && !s.weeks[2].covered);
});
// ---- import presets
import { detectPreset, IMPORT_PRESETS } from "../../dist/test/engines/importer.mjs";
test("import presets recognise Sports Connect and PlayMetrics style headers and map every column", () => {
  for (const p of IMPORT_PRESETS.filter((x) => x.id !== "generic")) { const header = p.template.split("\n")[0].split(","); assert.equal(detectPreset(header).id, p.id, p.id); const cols = detectColumns(header); for (const f of ["first", "last", "birthDate", "guardianFirst", "guardianLast", "guardianEmail", "guardianPhone", "division"]) assert.ok(cols[f] !== undefined, `${p.id} maps ${f}`); }
  assert.equal(detectPreset(["first", "last", "dob"]).id, "generic");
});

test("demo role holders are named for their role", () => {
  const names = demo.personas.map((p) => p.label); assert.deepEqual(names, ["Parent", "Player", "Head Coach", "Assistant Coach", "League President", "Treasurer", "Minor Commissioner", "Umpire", "Volunteer", "Platform Admin"]);
  for (const p of demo.personas) { const u = demo.users.find((x) => x.id === p.userId); if (p.role === "player") { assert.equal(demo.players.find((x) => x.id === p.playerId).firstName, "Player"); continue; } assert.equal(`${u.firstName} ${u.lastName}`.trim(), p.label, p.id); }
  const raw = JSON.stringify(demo); for (const old of ["Tyler Hill", "Mark Galasso", "Kenny Koplove", "Steve Koplove", "Coach Galasso", "Harbor Point"]) assert.ok(!raw.includes(old), `no leftover ${old}`);
});
