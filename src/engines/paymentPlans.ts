/* Payment plans: installment schedules, what is due, what is overdue. Processing connects at deployment;
   the ledger and the reminders work today. */
import type { Installment, PaymentPlan } from "../core/types";
import { addDays, toIsoDate, parseLocal } from "../core/dates";

/** Splits a balance into `count` equal monthly installments (cents rounded onto the last one). */
export function buildInstallments(total: number, count: number, firstDue: string, prefix = "inst"): Installment[] {
  const n = Math.max(1, Math.min(12, Math.round(count))); const base = Math.floor((total / n) * 100) / 100; const out: Installment[] = []; let acc = 0;
  for (let i = 0; i < n; i++) { const amount = i === n - 1 ? Math.round((total - acc) * 100) / 100 : base; acc += amount; const d = parseLocal(firstDue + "T12:00:00"); d.setMonth(d.getMonth() + i); out.push({ id: `${prefix}_${i + 1}`, dueDate: toIsoDate(d), amount }); }
  return out;
}
export function planPaid(plan: PaymentPlan) { return Math.round(plan.installments.filter((i) => i.paidAt).reduce((a, b) => a + b.amount, 0) * 100) / 100; }
export function planBalance(plan: PaymentPlan) { return Math.round((plan.total - planPaid(plan)) * 100) / 100; }
export function nextDue(plan: PaymentPlan): Installment | undefined { return plan.installments.filter((i) => !i.paidAt).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0]; }
export function overdueInstallments(plan: PaymentPlan, today: string): Installment[] { return plan.status === "active" ? plan.installments.filter((i) => !i.paidAt && i.dueDate < today) : []; }
export function dueSoon(plan: PaymentPlan, today: string, days = 7): Installment[] { const limit = toIsoDate(addDays(parseLocal(today + "T12:00:00"), days)); return plan.status === "active" ? plan.installments.filter((i) => !i.paidAt && i.dueDate >= today && i.dueDate <= limit) : []; }
export function planStatusLabel(plan: PaymentPlan, today: string): { label: string; tone: "grass" | "gold" | "stitch" | undefined } { if (plan.status === "complete") return { label: "Paid in full", tone: "grass" }; if (plan.status === "cancelled") return { label: "Cancelled", tone: undefined }; const od = overdueInstallments(plan, today); if (od.length) return { label: `${od.length} overdue`, tone: "stitch" }; if (dueSoon(plan, today).length) return { label: "Due this week", tone: "gold" }; return { label: "On schedule", tone: "grass" }; }
