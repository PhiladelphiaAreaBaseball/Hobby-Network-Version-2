import type { Division, EligibilityConfig, League, Registration } from "../core/types";
import { ageOn } from "../core/dates";
/** League age = age on the league's configured age-determination date. The date is configured per season from the
    current Little League rulebook; the platform never hardcodes it. */
export function leagueAge(birthDate: string, cfg: EligibilityConfig) { return ageOn(birthDate, cfg.ageDeterminationDate); }
export function eligibleDivisions(age: number, divisions: Division[]) { return divisions.filter((d) => age >= d.minLeagueAge && age <= d.maxLeagueAge); }
export interface ChecklistItem { id: string; label: string; status: "done" | "pending" | "action"; detail?: string; }
export function verificationChecklist(league: League, reg: Registration | null, childBirthDate: string | null): ChecklistItem[] {
  const cfg = league.settings.eligibility; const items: ChecklistItem[] = [];
  items.push({ id: "age", label: "League age confirmed from birth date", status: childBirthDate ? "done" : "pending", detail: childBirthDate ? `League age ${leagueAge(childBirthDate, cfg)} (as of ${cfg.ageDeterminationDate})` : "Add the child's birth date" });
  if (cfg.requiresResidenceOrSchoolVerification) {
    const docs = reg?.documents.filter((d) => d.type.startsWith("residence")) ?? [];
    const verified = docs.filter((d) => d.status === "verified").length;
    items.push({ id: "residence", label: `Residence or school eligibility (${cfg.residenceDocumentsRequired} documents, or school enrollment form)`, status: reg?.verification.residency === "verified" || reg?.verification.residency === "school" ? "done" : verified > 0 ? "pending" : "action", detail: reg ? `${verified}/${cfg.residenceDocumentsRequired} verified · ${reg.verification.residency}` : "Upload documents after submitting" });
  }
  for (const w of cfg.requiredWaivers) items.push({ id: `waiver-${w}`, label: w, status: reg?.waivers.find((x) => x.id === w)?.acceptedAt ? "done" : "action" });
  items.push({ id: "review", label: "League review and approval", status: reg?.status === "approved" || reg?.status === "assigned" ? "done" : "pending", detail: "A league administrator confirms eligibility. ZIP code alone never decides eligibility." });
  return items;
}
