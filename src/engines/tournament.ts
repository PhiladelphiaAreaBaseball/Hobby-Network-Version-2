/* Tournament formats: round robin, single elimination, double elimination, and pools followed by a bracket.
   Pure functions over the Tournament document. Matches reference each other by id so a result propagates
   downstream (`applyResult`), and byes resolve automatically when the bracket is generated. */
import type { ID, Tournament, TournamentFormat, TournamentMatch, TournamentPool } from "../core/types";

let seq = 0; const mid = (prefix: string) => `${prefix}_${(++seq).toString(36)}`;

/** Circle-method round robin. Odd team counts get a bye each round. */
export function roundRobin(teamIds: ID[], poolId?: ID): TournamentMatch[] {
  const ids = [...teamIds]; if (ids.length % 2 === 1) ids.push("__bye__"); const n = ids.length; const rounds = n - 1; const out: TournamentMatch[] = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) { const a = ids[i], b = ids[n - 1 - i]; if (a === "__bye__" || b === "__bye__") continue; const home = r % 2 === 0 ? a : b; const away = r % 2 === 0 ? b : a; out.push({ id: mid("m"), stage: "pool", round: r + 1, slot: i + 1, poolId, homeTeamId: home, awayTeamId: away }); }
    ids.splice(1, 0, ids.pop()!);
  }
  return out;
}
function nextPow2(n: number) { let p = 1; while (p < n) p *= 2; return p; }
/** Standard seeding order for a bracket of `size` (1 v size, then the halves recursively). */
export function seedOrder(size: number): number[] { let order = [1]; while (order.length < size) { const next: number[] = []; const m = order.length * 2 + 1; for (const s of order) next.push(s, m - s); order = next; } return order; }
/** Single elimination from seeds (index 0 = seed 1). Byes are resolved immediately. */
export function singleElim(seeds: ID[]): TournamentMatch[] {
  const size = nextPow2(Math.max(2, seeds.length)); const order = seedOrder(size); const rounds = Math.log2(size); const matches: TournamentMatch[] = []; const bySlot: TournamentMatch[][] = [];
  for (let r = 1; r <= rounds; r++) { const count = size / Math.pow(2, r); const row: TournamentMatch[] = []; for (let s = 1; s <= count; s++) { const m: TournamentMatch = { id: mid("w"), stage: r === rounds ? "final" : "winners", round: r, slot: s, homeTeamId: null, awayTeamId: null }; if (r === 1) { const hs = order[(s - 1) * 2], as = order[(s - 1) * 2 + 1]; m.homeFrom = { seed: hs }; m.awayFrom = { seed: as }; m.homeTeamId = seeds[hs - 1] ?? null; m.awayTeamId = seeds[as - 1] ?? null; } else { const prev = bySlot[r - 2]; const a = prev[(s - 1) * 2], b = prev[(s - 1) * 2 + 1]; m.homeFrom = { matchId: a.id, take: "winner" }; m.awayFrom = { matchId: b.id, take: "winner" }; } row.push(m); matches.push(m); } bySlot.push(row); }
  resolveByes(matches); return matches;
}
/** Double elimination: a winners bracket, a losers bracket that absorbs each winners round's losers, and a final.
    (A bracket-reset second final is left to the director; the final is one game.) */
export function doubleElim(seeds: ID[]): TournamentMatch[] {
  const size = nextPow2(Math.max(2, seeds.length)); const k = Math.log2(size); const w = singleElim(seeds).map((m) => ({ ...m, stage: "winners" as const })); const wRounds: TournamentMatch[][] = []; for (let r = 1; r <= k; r++) wRounds.push(w.filter((m) => m.round === r));
  const l: TournamentMatch[] = []; let prevL: TournamentMatch[] = []; let lr = 0;
  // L1: losers of W1 paired
  lr++; const w1 = wRounds[0]; for (let i = 0; i < w1.length; i += 2) l.push({ id: mid("l"), stage: "losers", round: lr, slot: i / 2 + 1, homeTeamId: null, awayTeamId: null, homeFrom: { matchId: w1[i].id, take: "loser" }, awayFrom: { matchId: w1[i + 1].id, take: "loser" } });
  prevL = l.filter((m) => m.round === lr);
  for (let r = 2; r <= k; r++) {
    // drop-in round: survivors of previous losers round vs losers of winners round r (reversed to avoid rematches)
    lr++; const wr = [...wRounds[r - 1]].reverse(); const drop: TournamentMatch[] = prevL.map((pm, i) => ({ id: mid("l"), stage: "losers" as const, round: lr, slot: i + 1, homeTeamId: null, awayTeamId: null, homeFrom: { matchId: pm.id, take: "winner" as const }, awayFrom: { matchId: wr[i].id, take: "loser" as const } })); l.push(...drop); prevL = drop;
    if (prevL.length > 1) { lr++; const pair: TournamentMatch[] = []; for (let i = 0; i < prevL.length; i += 2) pair.push({ id: mid("l"), stage: "losers", round: lr, slot: i / 2 + 1, homeTeamId: null, awayTeamId: null, homeFrom: { matchId: prevL[i].id, take: "winner" }, awayFrom: { matchId: prevL[i + 1].id, take: "winner" } }); l.push(...pair); prevL = pair; }
  }
  const final: TournamentMatch = { id: mid("f"), stage: "final", round: 1, slot: 1, homeTeamId: null, awayTeamId: null, homeFrom: { matchId: wRounds[k - 1][0].id, take: "winner" }, awayFrom: { matchId: prevL[0].id, take: "winner" } };
  const all = [...w, ...l, final]; resolveByes(all); return all;
}
/** Pools (round robin) whose placings feed a single-elimination bracket; `advance` teams per pool. */
export function poolsThenBracket(teamIds: ID[], poolCount: number, advance: number): { pools: TournamentPool[]; matches: TournamentMatch[] } {
  const pools: TournamentPool[] = Array.from({ length: poolCount }, (_, i) => ({ id: mid("p"), name: `Pool ${String.fromCharCode(65 + i)}`, teamIds: [] })); teamIds.forEach((id, i) => { const row = Math.floor(i / poolCount); const col = row % 2 === 0 ? i % poolCount : poolCount - 1 - (i % poolCount); pools[col].teamIds.push(id); });
  const matches = pools.flatMap((p) => roundRobin(p.teamIds, p.id));
  // bracket placeholders: seed order pairs pool winners against other pools' runners-up
  const slots: { poolId: ID; place: number }[] = []; for (let place = 1; place <= advance; place++) for (let pi = 0; pi < poolCount; pi++) slots.push({ poolId: pools[pi].id, place });
  const bracket = singleElim(slots.map((_, i) => `__slot${i}__`)); for (const m of bracket) { if (m.round === 1) { const hs = (m.homeFrom as { seed: number }).seed, as = (m.awayFrom as { seed: number }).seed; m.homeFrom = slots[hs - 1] ?? undefined; m.awayFrom = slots[as - 1] ?? undefined; m.homeTeamId = null; m.awayTeamId = null; if (!m.homeFrom || !m.awayFrom) m.bye = true; } m.winnerTeamId = undefined; m.loserTeamId = undefined; }
  return { pools, matches: [...matches, ...bracket] };
}
/** A bye is a match with exactly one team and no source for the other; its winner is that team. */
function resolveByes(matches: TournamentMatch[]) {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const settle = (m: TournamentMatch) => { const hasHome = m.homeTeamId || (m.homeFrom && "matchId" in m.homeFrom); const hasAway = m.awayTeamId || (m.awayFrom && "matchId" in m.awayFrom); if (m.homeTeamId && !hasAway) { m.bye = true; m.winnerTeamId = m.homeTeamId; } else if (m.awayTeamId && !hasHome) { m.bye = true; m.winnerTeamId = m.awayTeamId; } else if (!hasHome && !hasAway && !m.homeTeamId && !m.awayTeamId) m.bye = true; };
  for (const m of matches) if (m.round === 1 && m.stage !== "losers") settle(m);
  // propagate byes forward until stable
  let changed = true; let guard = 0; while (changed && guard++ < 50) { changed = false; for (const m of matches) { for (const side of ["home", "away"] as const) { const from = side === "home" ? m.homeFrom : m.awayFrom; if (from && "matchId" in from) { const src = byId.get(from.matchId); if (!src) continue; const id = from.take === "winner" ? src.winnerTeamId : src.loserTeamId; const cur = side === "home" ? m.homeTeamId : m.awayTeamId; if (src.bye && from.take === "loser" && !cur) { /* nobody lost a bye: this side stays empty */ } if (id && cur !== id) { if (side === "home") m.homeTeamId = id; else m.awayTeamId = id; changed = true; } } } if (!m.winnerTeamId && m.stage === "losers") { const hb = m.homeFrom && "matchId" in m.homeFrom ? byId.get(m.homeFrom.matchId) : undefined; const ab = m.awayFrom && "matchId" in m.awayFrom ? byId.get(m.awayFrom.matchId) : undefined; const homeDead = hb?.bye && m.homeFrom && "take" in m.homeFrom && m.homeFrom.take === "loser"; const awayDead = ab?.bye && m.awayFrom && "take" in m.awayFrom && m.awayFrom.take === "loser"; if (homeDead && awayDead) { m.bye = true; } else if (homeDead && m.awayTeamId) { m.bye = true; m.winnerTeamId = m.awayTeamId; changed = true; } else if (awayDead && m.homeTeamId) { m.bye = true; m.winnerTeamId = m.homeTeamId; changed = true; } } } }
}
export function generate(format: TournamentFormat, seeds: ID[], opts: { poolCount?: number; advance?: number } = {}): { pools: TournamentPool[]; matches: TournamentMatch[] } {
  seq = 0;
  if (format === "round_robin") return { pools: [], matches: roundRobin(seeds) };
  if (format === "single_elim") return { pools: [], matches: singleElim(seeds) };
  if (format === "double_elim") return { pools: [], matches: doubleElim(seeds) };
  return poolsThenBracket(seeds, opts.poolCount ?? 2, opts.advance ?? 2);
}
export interface PoolRow { teamId: ID; w: number; l: number; t: number; rf: number; ra: number; pts: number; }
export function poolStandings(t: Tournament, poolId: ID): PoolRow[] {
  const pool = t.pools.find((p) => p.id === poolId); if (!pool) return []; const rows = new Map(pool.teamIds.map((id) => [id, { teamId: id, w: 0, l: 0, t: 0, rf: 0, ra: 0, pts: 0 } as PoolRow]));
  for (const m of t.matches) { if (m.poolId !== poolId || m.homeScore === undefined || m.awayScore === undefined || !m.homeTeamId || !m.awayTeamId) continue; const h = rows.get(m.homeTeamId)!, a = rows.get(m.awayTeamId)!; h.rf += m.homeScore; h.ra += m.awayScore; a.rf += m.awayScore; a.ra += m.homeScore; if (m.homeScore > m.awayScore) { h.w++; a.l++; } else if (m.awayScore > m.homeScore) { a.w++; h.l++; } else { h.t++; a.t++; } }
  for (const r of rows.values()) r.pts = r.w * 2 + r.t; return [...rows.values()].sort((x, y) => y.pts - x.pts || (y.rf - y.ra) - (x.rf - x.ra) || y.rf - x.rf);
}
/** True when every pool game has a score. */
export function poolsComplete(t: Tournament) { return t.matches.filter((m) => m.stage === "pool").every((m) => m.homeScore !== undefined && m.awayScore !== undefined); }
/** Records a score and fills every match that depends on it. Also seeds the bracket from pools once they are complete. */
export function applyResult(t: Tournament, matchId: ID, homeScore: number, awayScore: number): Tournament {
  const matches = t.matches.map((m) => ({ ...m })); const byId = new Map(matches.map((m) => [m.id, m])); const m = byId.get(matchId); if (!m || !m.homeTeamId || !m.awayTeamId) return t;
  m.homeScore = homeScore; m.awayScore = awayScore; if (m.stage !== "pool") { if (homeScore === awayScore) return { ...t, matches, updatedAt: t.updatedAt }; m.winnerTeamId = homeScore > awayScore ? m.homeTeamId : m.awayTeamId; m.loserTeamId = homeScore > awayScore ? m.awayTeamId : m.homeTeamId; }
  const next = { ...t, matches }; if (next.format === "pools_bracket" && poolsComplete(next)) { for (const bm of matches) for (const side of ["home", "away"] as const) { const from = side === "home" ? bm.homeFrom : bm.awayFrom; if (from && "poolId" in from) { const row = poolStandings(next, from.poolId)[from.place - 1]; if (row) { if (side === "home") bm.homeTeamId = row.teamId; else bm.awayTeamId = row.teamId; } } } }
  let changed = true; let guard = 0; while (changed && guard++ < 50) { changed = false; for (const x of matches) for (const side of ["home", "away"] as const) { const from = side === "home" ? x.homeFrom : x.awayFrom; if (from && "matchId" in from) { const src = byId.get(from.matchId); const id = src ? (from.take === "winner" ? src.winnerTeamId : src.loserTeamId) : undefined; const cur = side === "home" ? x.homeTeamId : x.awayTeamId; if (id && cur !== id) { if (side === "home") x.homeTeamId = id; else x.awayTeamId = id; changed = true; } } } }
  const final = matches.find((x) => x.stage === "final"); const rrDone = next.format === "round_robin" && matches.every((x) => x.homeScore !== undefined);
  let champion = final?.winnerTeamId; let runnerUp = final?.loserTeamId; if (rrDone) { const table = roundRobinTable(next); champion = table[0]?.teamId; runnerUp = table[1]?.teamId; }
  return { ...next, status: champion ? "complete" : "live", championTeamId: champion, runnerUpTeamId: runnerUp };
}
export function roundRobinTable(t: Tournament): PoolRow[] { const fake: Tournament = { ...t, pools: [{ id: "__all__", name: "All", teamIds: t.teamIds }], matches: t.matches.map((m) => ({ ...m, poolId: "__all__" })) }; return poolStandings(fake, "__all__"); }
/** Games that can be scheduled or scored now: both teams known and no score yet. */
export function playable(t: Tournament): TournamentMatch[] { return t.matches.filter((m) => m.homeTeamId && m.awayTeamId && !m.bye && m.homeScore === undefined); }
export const FORMAT_LABEL: Record<TournamentFormat, string> = { round_robin: "Round robin", single_elim: "Single elimination", double_elim: "Double elimination", pools_bracket: "Pools, then bracket" };
export function stageLabel(m: TournamentMatch, t: Tournament): string { if (m.stage === "pool") { const p = t.pools.find((x) => x.id === m.poolId); return `${p?.name ?? "Pool"} · round ${m.round}`; } if (m.stage === "final") return t.format === "double_elim" ? "Championship" : "Final"; const total = Math.max(...t.matches.filter((x) => x.stage === m.stage).map((x) => x.round)); if (m.stage === "winners") return m.round === total ? "Semifinal" : m.round === total - 1 ? "Quarterfinal" : `Round ${m.round}`; return `Elimination round ${m.round}`; }
