/* Field Improvement Fund Calculator: pure, reusable financial formulas. Registration happens once per year and
   enrollment stays constant. Estimates exclude operating expenses, taxes, inflation, financing costs and investment returns. */
export interface TurfInputs { players: number; fee: number; league: number; turf: number; cost: number; }
export const DEFAULT_INPUTS: TurfInputs = { players: 400, fee: 300, league: 150, turf: 100, cost: 150000 };
export const LIMITS = { players: { min: 50, max: 2000, step: 25 }, fee: { min: 100, max: 1000, step: 25 }, league: { min: 0, step: 25 }, turf: { min: 0, step: 25 }, cost: { min: 50000, max: 500000, step: 5000 } } as const;
export interface ProjectPreset { id: string; label: string; cost: number | null; note: string; }
export const PRESETS: ProjectPreset[] = [
  { id: "infield_5070", label: "50/70 Baseball Infield", cost: 150000, note: "Synthetic turf on the skinned infield and base paths of an intermediate (50/70) diamond." },
  { id: "infield_6090", label: "60/90 Baseball Infield", cost: 240000, note: "Larger regulation-size infield; more square footage, drainage and edging." },
  { id: "full_field", label: "Full Baseball Field", cost: 450000, note: "Infield and outfield turf, including grading, drainage and sub-base." },
  { id: "softball_infield", label: "Softball Infield", cost: 125000, note: "Smaller all-dirt softball infield converted to turf." },
  { id: "custom", label: "Custom Facility Improvement", cost: null, note: "Enter your own estimate for lights, fencing, dugouts, batting cages or any other project." },
];
const snap = (v: number, step: number) => Math.round(v / step) * step;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Enforces ranges, step increments, non-negative allocations and league + turf <= fee. */
export function clampInputs(i: TurfInputs, changed?: keyof TurfInputs): TurfInputs {
  const players = clamp(snap(num(i.players, DEFAULT_INPUTS.players), LIMITS.players.step), LIMITS.players.min, LIMITS.players.max);
  const fee = clamp(snap(num(i.fee, DEFAULT_INPUTS.fee), LIMITS.fee.step), LIMITS.fee.min, LIMITS.fee.max);
  let league = clamp(snap(num(i.league, 0), LIMITS.league.step), 0, fee);
  let turf = clamp(snap(num(i.turf, 0), LIMITS.turf.step), 0, fee);
  if (league + turf > fee) { if (changed === "turf") league = fee - turf; else turf = fee - league; }
  const cost = clamp(snap(num(i.cost, DEFAULT_INPUTS.cost), LIMITS.cost.step), LIMITS.cost.min, LIMITS.cost.max);
  return { players, fee, league, turf, cost };
}
const num = (v: unknown, fallback: number) => { const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? n : fallback; };
export interface TurfResult {
  platformPerPlayer: number; totalRevenue: number; leagueRevenue: number; turfSavings: number; platformRevenue: number;
  pct: { league: number; turf: number; platform: number }; yearsToFund: number | null; cyclesToFund: number | null; firstYearPct: number; firstYearPctCapped: number;
  projection: { year: number; cumulative: number; annual: number; funded: boolean }[]; fundedYear: number | null;
}
export function computeTurf(raw: TurfInputs): TurfResult {
  const i = clampInputs(raw);
  const platformPerPlayer = i.fee - i.league - i.turf;
  const totalRevenue = i.players * i.fee; const leagueRevenue = i.players * i.league; const turfSavings = i.players * i.turf; const platformRevenue = i.players * platformPerPlayer;
  const pctOf = (n: number) => (totalRevenue ? Math.round((n / totalRevenue) * 1000) / 10 : 0);
  const yearsToFund = turfSavings > 0 ? Math.round((i.cost / turfSavings) * 100) / 100 : null;
  const cyclesToFund = turfSavings > 0 ? Math.ceil(i.cost / turfSavings) : null;
  const firstYearPct = i.cost > 0 ? Math.round((turfSavings / i.cost) * 1000) / 10 : 0;
  const projection = Array.from({ length: 11 }, (_, year) => ({ year, annual: turfSavings, cumulative: turfSavings * year, funded: turfSavings * year >= i.cost && i.cost > 0 }));
  const fundedYear = projection.find((p) => p.year > 0 && p.funded)?.year ?? null;
  return { platformPerPlayer, totalRevenue, leagueRevenue, turfSavings, platformRevenue, pct: { league: pctOf(leagueRevenue), turf: pctOf(turfSavings), platform: pctOf(platformRevenue) }, yearsToFund, cyclesToFund, firstYearPct, firstYearPctCapped: Math.min(100, firstYearPct), projection, fundedYear };
}
export const fmtUSD = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
/** Scenario codes use only letters, digits and hyphens so they survive the artifact's plain-hash links: p400-f300-l150-t100-c150000 */
export function encodeScenario(i: TurfInputs): string { const c = clampInputs(i); return `p${c.players}-f${c.fee}-l${c.league}-t${c.turf}-c${c.cost}`; }
export function decodeScenario(code: string): TurfInputs | null {
  const m = /^p(\d+)-f(\d+)-l(\d+)-t(\d+)-c(\d+)$/.exec((code || "").trim().toLowerCase()); if (!m) return null;
  return clampInputs({ players: +m[1], fee: +m[2], league: +m[3], turf: +m[4], cost: +m[5] });
}
export function describeTimeline(r: TurfResult): { headline: string; detail: string } {
  if (r.yearsToFund === null) return { headline: "No funding allocated", detail: "Move the turf fund slider above $0 to see a timeline." };
  return { headline: `${formatYears(r.yearsToFund)} years`, detail: `Fully funded after ${r.cyclesToFund} annual registration ${r.cyclesToFund === 1 ? "cycle" : "cycles"}.` };
}

/** At least one decimal place, at most two: 3.75 stays 3.75, 3.80 reads 3.8, 3.333 reads 3.33. */
export const formatYears = (y: number) => y.toFixed(2).replace(/(\.\d)0$/, "$1");
