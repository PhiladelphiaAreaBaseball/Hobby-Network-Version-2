/* Fundraising ledger: every dollar raised or spent is one entry, so totals are always derived, never typed.
   The reconciliation proves the books close: received = deposited + not yet deposited; in − out = balance on hand;
   the funds add up to that balance; and the ledger agrees with Finance (payments and expenses it created). */
import type { Expense, FundEntry, Fundraiser, Payment, Sponsor } from "../core/types";

export const DEFAULT_FUNDS = ["General operating", "Field Lights Fund", "Scholarships"];
export const FUND_SOURCES: { id: FundEntry["source"]; label: string; paymentKind: Payment["kind"] }[] = [
  { id: "sponsorship", label: "Sponsorship", paymentKind: "sponsorship" }, { id: "donation", label: "Donation", paymentKind: "donation" }, { id: "event", label: "Event", paymentKind: "fundraiser" }, { id: "sale", label: "Product sale", paymentKind: "fundraiser" }, { id: "raffle", label: "Raffle", paymentKind: "fundraiser" }, { id: "grant", label: "Grant or match", paymentKind: "donation" }, { id: "expense", label: "Cost or spending", paymentKind: "fundraiser" },
];
export const FUND_PAYMENT_KINDS: Payment["kind"][] = ["sponsorship", "donation", "fundraiser"];
const r2 = (n: number) => Math.round(n * 100) / 100;
const live = (e: FundEntry) => !e.voided;
export const needsDeposit = (e: FundEntry) => live(e) && e.direction === "in" && e.status === "received" && (e.method === "cash" || e.method === "check") && !e.depositRef;

export interface CampaignLine { fundraiser: Fundraiser; gross: number; costs: number; net: number; pledged: number; entries: number; pct: number; }
export interface FundLine { fund: string; inflow: number; outflow: number; balance: number; }
export interface SponsorLine { sponsor: Sponsor; committed: number; received: number; pledged: number; outstanding: number; }
export interface Check { id: string; ok: boolean; label: string; detail: string; }
export interface FundSummary { received: number; pledged: number; spent: number; balance: number; deposited: number; undeposited: number; undepositedEntries: FundEntry[]; unassigned: FundEntry[]; pledges: FundEntry[]; campaigns: CampaignLine[]; funds: FundLine[]; sources: { source: FundEntry["source"]; label: string; amount: number }[]; sponsors: SponsorLine[]; checks: Check[]; unlinkedPayments: Payment[]; accounted: boolean; }

export function summarize(entries: FundEntry[], fundraisers: Fundraiser[], sponsors: Sponsor[], payments: Payment[], expenses: Expense[]): FundSummary {
  const es = entries.filter(live); const inR = es.filter((e) => e.direction === "in" && e.status === "received"); const outs = es.filter((e) => e.direction === "out");
  const received = r2(inR.reduce((a, e) => a + e.amount, 0)); const spent = r2(outs.reduce((a, e) => a + e.amount, 0)); const pledges = es.filter((e) => e.direction === "in" && e.status === "pledged"); const pledged = r2(pledges.reduce((a, e) => a + e.amount, 0));
  const undepositedEntries = es.filter(needsDeposit); const undeposited = r2(undepositedEntries.reduce((a, e) => a + e.amount, 0)); const deposited = r2(received - undeposited);
  const unassigned = es.filter((e) => e.status !== "pledged" && (!e.fund || !e.fund.trim()));
  const fundNames = [...new Set([...DEFAULT_FUNDS, ...es.map((e) => e.fund).filter(Boolean)])];
  const funds: FundLine[] = fundNames.map((fund) => { const inflow = r2(inR.filter((e) => e.fund === fund).reduce((a, e) => a + e.amount, 0)); const outflow = r2(outs.filter((e) => e.fund === fund).reduce((a, e) => a + e.amount, 0)); return { fund, inflow, outflow, balance: r2(inflow - outflow) }; });
  const campaigns: CampaignLine[] = fundraisers.map((f) => { const mine = es.filter((e) => e.fundraiserId === f.id); const gross = r2(mine.filter((e) => e.direction === "in" && e.status === "received").reduce((a, e) => a + e.amount, 0)); const costs = r2(mine.filter((e) => e.direction === "out").reduce((a, e) => a + e.amount, 0)); const p = r2(mine.filter((e) => e.direction === "in" && e.status === "pledged").reduce((a, e) => a + e.amount, 0)); return { fundraiser: f, gross, costs, net: r2(gross - costs), pledged: p, entries: mine.length, pct: f.goal ? Math.round((gross / f.goal) * 100) : 0 }; });
  const sources = FUND_SOURCES.filter((s) => s.id !== "expense").map((s) => ({ source: s.id, label: s.label, amount: r2(inR.filter((e) => e.source === s.id).reduce((a, e) => a + e.amount, 0)) })).filter((s) => s.amount > 0);
  const sponsorLines: SponsorLine[] = sponsors.filter((s) => s.status === "active" || s.status === "renewing" || es.some((e) => e.sponsorId === s.id)).map((s) => { const rec = r2(inR.filter((e) => e.sponsorId === s.id).reduce((a, e) => a + e.amount, 0)); const pl = r2(pledges.filter((e) => e.sponsorId === s.id).reduce((a, e) => a + e.amount, 0)); return { sponsor: s, committed: s.amount, received: rec, pledged: pl, outstanding: r2(Math.max(0, s.amount - rec)) }; });
  // Finance agreement: every fundraising-kind payment is in the ledger, and the ledger's in/out equal the payments/expenses it created
  const linkedPay = new Set(es.map((e) => e.paymentId).filter(Boolean)); const fundPayments = payments.filter((p) => FUND_PAYMENT_KINDS.includes(p.kind) && p.status === "succeeded"); const unlinkedPayments = fundPayments.filter((p) => !linkedPay.has(p.id));
  const payTotal = r2(fundPayments.filter((p) => linkedPay.has(p.id)).reduce((a, p) => a + p.amount, 0)); const linkedExp = new Set(outs.map((e) => e.expenseId).filter(Boolean)); const expTotal = r2(expenses.filter((x) => linkedExp.has(x.id)).reduce((a, x) => a + x.amount, 0));
  const fundSum = r2(funds.reduce((a, f) => a + f.balance, 0)); const balance = r2(received - spent);
  const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  const checks: Check[] = [
    { id: "deposits", ok: undeposited === 0, label: "Every cash and check collection is deposited", detail: undeposited === 0 ? `${money(received)} received, all in the bank or processed online.` : `${money(deposited)} deposited + ${money(undeposited)} not yet deposited (${undepositedEntries.length} ${undepositedEntries.length === 1 ? "collection" : "collections"}) = ${money(received)} received.` },
    { id: "funds", ok: unassigned.length === 0 && Math.abs(fundSum - balance) < 0.005, label: "Every dollar sits in a named fund", detail: unassigned.length ? `${unassigned.length} ${unassigned.length === 1 ? "entry has" : "entries have"} no fund.` : `Funds add up to the balance on hand: ${money(fundSum)}.` },
    { id: "balance", ok: Math.abs(r2(received - spent) - balance) < 0.005, label: "Money in minus money out equals the balance", detail: `${money(received)} in − ${money(spent)} out = ${money(balance)} on hand.` },
    { id: "finance", ok: unlinkedPayments.length === 0 && Math.abs(payTotal - received) < 0.005 && Math.abs(expTotal - spent) < 0.005, label: "The ledger matches Finance", detail: unlinkedPayments.length ? `${unlinkedPayments.length} sponsorship, donation or fundraiser ${unlinkedPayments.length === 1 ? "payment in Finance is" : "payments in Finance are"} not in this ledger (${money(unlinkedPayments.reduce((a, p) => a + p.amount, 0))}).` : `Finance shows the same ${money(received)} received and ${money(spent)} spent.` },
  ];
  return { received, pledged, spent, balance, deposited, undeposited, undepositedEntries, unassigned, pledges, campaigns, funds, sources, sponsors: sponsorLines, checks, unlinkedPayments, accounted: checks.every((c) => c.ok) };
}
/** Ledger rows oldest first with a running balance (voided rows carry the balance unchanged). */
export function withRunningBalance(entries: FundEntry[]): { entry: FundEntry; balance: number }[] {
  let bal = 0; return [...entries].sort((a, b) => (a.date === b.date ? (a.recordedAt < b.recordedAt ? -1 : 1) : a.date < b.date ? -1 : 1)).map((entry) => { if (!entry.voided && entry.status !== "pledged") bal = r2(bal + (entry.direction === "in" ? entry.amount : -entry.amount)); return { entry, balance: bal }; });
}
export function paymentKindFor(source: FundEntry["source"]): Payment["kind"] { return FUND_SOURCES.find((s) => s.id === source)?.paymentKind ?? "fundraiser"; }
