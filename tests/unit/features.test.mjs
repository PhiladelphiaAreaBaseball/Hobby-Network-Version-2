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
  assert.ok(demo.certifications.length > 30); const mark = demo.users.find((u) => u.firstName === "Mark" && u.lastName === "Galasso"); const markSt = personStatus(cert.items, demo.certifications, mark.id, "head_coach", today); assert.equal(markSt.requiredDone, 4); assert.ok(!markSt.complete);
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
  const fam = familiesOfTeams(["t09"], demo.players, demo.teams); const comets = demo.teams.find((t) => t.id === "t09"); assert.ok(fam.includes(comets.headCoachUserId)); assert.ok(fam.includes(demo.players.find((p) => p.firstName === "Jack" && p.lastName === "Hill").guardianUserIds[0]));
});
test("family calendar: one feed with games, duties, deadlines and alarms; ICS is well formed", () => {
  const tyler = demo.users.find((u) => u.firstName === "Tyler" && u.lastName === "Hill"); const kids = demo.players.filter((p) => p.guardianUserIds.includes(tyler.id)); const today = demo.seasons[0].startDate;
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
