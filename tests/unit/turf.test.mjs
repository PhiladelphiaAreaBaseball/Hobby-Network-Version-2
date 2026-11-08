import test from "node:test";
import assert from "node:assert/strict";
import { computeTurf, clampInputs, DEFAULT_INPUTS, encodeScenario, decodeScenario, describeTimeline, formatYears } from "../../dist/test/engines/turfCalculator.mjs";
import { SimplePdf } from "../../dist/test/engines/pdf.mjs";
test("default example matches the specification", () => {
  const r = computeTurf(DEFAULT_INPUTS);
  assert.equal(r.platformPerPlayer, 50); assert.equal(r.totalRevenue, 120000); assert.equal(r.leagueRevenue, 60000); assert.equal(r.turfSavings, 40000); assert.equal(r.platformRevenue, 20000);
  assert.equal(r.yearsToFund, 3.75); assert.equal(formatYears(3.75), "3.75"); assert.equal(formatYears(3.8), "3.8"); assert.equal(formatYears(10 / 3), "3.33"); assert.equal(describeTimeline(r).headline, "3.75 years"); assert.equal(r.cyclesToFund, 4); assert.equal(r.fundedYear, 4); assert.deepEqual(r.pct, { league: 50, turf: 33.3, platform: 16.7 });
  assert.equal(r.projection[1].cumulative, 40000); assert.equal(r.projection[4].cumulative, 160000); assert.equal(r.firstYearPct, 26.7);
});
test("allocations never exceed the registration fee or go negative", () => {
  const c = clampInputs({ players: 400, fee: 200, league: 150, turf: 100, cost: 150000 }); assert.equal(c.league + c.turf <= c.fee, true); assert.equal(c.turf, 50);
  const c2 = clampInputs({ players: 400, fee: 200, league: 150, turf: 100, cost: 150000 }, "turf"); assert.equal(c2.turf, 100); assert.equal(c2.league, 100);
  const c3 = clampInputs({ players: -5, fee: 5, league: -20, turf: -20, cost: 10 }); assert.equal(c3.players, 50); assert.equal(c3.fee, 100); assert.equal(c3.league, 0); assert.equal(c3.turf, 0); assert.equal(c3.cost, 50000);
  assert.equal(clampInputs({ ...DEFAULT_INPUTS, players: 413 }).players, 425);
});
test("zero turf allocation is handled without dividing by zero", () => { const r = computeTurf({ ...DEFAULT_INPUTS, turf: 0 }); assert.equal(r.yearsToFund, null); assert.equal(r.cyclesToFund, null); assert.equal(r.fundedYear, null); assert.equal(describeTimeline(r).headline, "No funding allocated"); });
test("scenario codes round-trip and reject garbage", () => { const code = encodeScenario(DEFAULT_INPUTS); assert.equal(code, "p400-f300-l150-t100-c150000"); assert.deepEqual(decodeScenario(code), DEFAULT_INPUTS); assert.equal(decodeScenario("hello"), null); assert.equal(decodeScenario("p400-f300-l150-t100")?.cost, undefined); });
test("pdf writer emits a well-formed document", () => { const pdf = new SimplePdf(); pdf.text(40, 40, "GamePlanIQ (test) \\ done", 14, { bold: true }); pdf.rect(40, 80, 200, 20, [0.2, 0.5, 0.3]); pdf.line(40, 120, 300, 120, [0, 0, 0], 1, "3 2"); pdf.paragraph(40, 140, "word ".repeat(80), 10, 300); pdf.newPage(); pdf.text(40, 40, "page two", 12); const bytes = pdf.build(); const s = Buffer.from(bytes).toString("latin1"); assert.ok(s.startsWith("%PDF-1.4")); assert.ok(s.includes("/Count 2")); assert.ok(s.trimEnd().endsWith("%%EOF")); const xref = Number(/startxref\n(\d+)/.exec(s)[1]); assert.equal(s.slice(xref, xref + 4), "xref"); assert.ok(s.includes("\\\\ done")); });
