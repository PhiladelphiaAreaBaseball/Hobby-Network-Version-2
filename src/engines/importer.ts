/* CSV import of players and guardians from a prior season or another registration system.
   Parsing and validation are pure so the admin can preview every row before anything is written. */
import type { Division, EligibilityConfig } from "../core/types";
import { leagueAge, eligibleDivisions } from "./eligibility";

/** RFC-4180-ish parser: quoted fields, doubled quotes, CRLF, trailing newline. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false; const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) { if (ch === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += ch; continue; }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ",") { row.push(field); field = ""; continue; }
    if (ch === "\n" || ch === "\r") { if (ch === "\r" && src[i + 1] === "\n") i++; row.push(field); field = ""; if (row.some((c) => c.trim() !== "")) rows.push(row); row = []; continue; }
    field += ch;
  }
  row.push(field); if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}
export type ImportField = "first" | "last" | "birthDate" | "guardianFirst" | "guardianLast" | "guardianEmail" | "guardianPhone" | "division" | "jersey" | "bats" | "throws";
const ALIASES: Record<ImportField, string[]> = {
  first: ["first", "firstname", "first name", "player first", "player first name", "playerfirst", "child first", "given name", "participant first name", "participant first", "athlete first name", "member first name"],
  last: ["last", "lastname", "last name", "player last", "player last name", "playerlast", "child last", "surname", "family name", "participant last name", "participant last", "athlete last name", "member last name"],
  birthDate: ["birthdate", "birth date", "dob", "date of birth", "birthday", "born", "participant date of birth", "participant dob", "player date of birth", "player dob", "athlete dob"],
  guardianFirst: ["guardian first", "parent first", "guardianfirst", "parentfirst", "parent first name", "guardian first name", "parent1 first", "mother first", "father first", "parent 1 first name", "parent/guardian 1 first name", "primary contact first name", "primary parent first name", "account holder first name", "guardian 1 first name"],
  guardianLast: ["guardian last", "parent last", "guardianlast", "parentlast", "parent last name", "guardian last name", "parent1 last", "parent 1 last name", "parent/guardian 1 last name", "primary contact last name", "primary parent last name", "account holder last name", "guardian 1 last name"],
  guardianEmail: ["email", "guardian email", "parent email", "e-mail", "parent1 email", "contact email", "parent 1 email", "parent/guardian 1 email", "primary contact email", "primary parent email", "account email", "account holder email", "guardian 1 email", "email address"],
  guardianPhone: ["phone", "guardian phone", "parent phone", "mobile", "cell", "parent1 phone", "contact phone", "parent 1 cell phone", "parent 1 phone", "parent/guardian 1 phone", "primary contact phone", "primary contact mobile", "primary parent phone", "cell phone", "mobile phone", "guardian 1 phone"],
  division: ["division", "div", "level", "program", "requested division", "program name", "division name", "program/division", "registered program", "team level", "age group"],
  jersey: ["jersey", "number", "jersey number", "#", "uniform number", "jersey #"],
  bats: ["bats", "bat side", "batting"],
  throws: ["throws", "throw side", "throwing"],
};
export function detectColumns(header: string[]): Partial<Record<ImportField, number>> {
  const out: Partial<Record<ImportField, number>> = {}; const norm = header.map((h) => h.toLowerCase().replace(/[_\-.]/g, " ").replace(/\s+/g, " ").trim());
  for (const [field, names] of Object.entries(ALIASES) as [ImportField, string[]][]) { const idx = norm.findIndex((h) => names.includes(h)); if (idx >= 0) out[field] = idx; }
  // "name" style single columns
  if (out.first === undefined && out.last === undefined) { const idx = norm.findIndex((h) => h === "name" || h === "player" || h === "player name"); if (idx >= 0) { out.first = idx; (out as any).__fullName = true; } }
  if (out.guardianFirst === undefined && out.guardianLast === undefined) { const idx = norm.findIndex((h) => h === "guardian" || h === "parent" || h === "parent name" || h === "guardian name"); if (idx >= 0) { out.guardianFirst = idx; (out as any).__fullGuardian = true; } }
  return out;
}
export function normalizeDate(raw: string): string | null {
  const s = raw.trim(); if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s); if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s); if (m) { const y = m[3].length === 2 ? (Number(m[3]) > 30 ? "19" : "20") + m[3] : m[3]; return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`; }
  const d = new Date(s); if (!isNaN(d.getTime()) && /\d{4}/.test(s)) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return null;
}
export interface ImportRecord { row: number; first: string; last: string; birthDate: string | null; leagueAge: number | null; guardianFirst: string; guardianLast: string; guardianEmail: string; guardianPhone: string; divisionName: string; divisionId: string | null; jersey: number | null; bats: "R" | "L" | "S"; throws: "R" | "L"; problems: string[]; warnings: string[]; }
export function mapRows(rows: string[][], divisions: Division[], eligibility: EligibilityConfig, existing: { players: { firstName: string; lastName: string; birthDate: string }[]; emails: Set<string> }): { records: ImportRecord[]; columns: Partial<Record<ImportField, number>>; header: string[] } {
  if (rows.length === 0) return { records: [], columns: {}, header: [] };
  const header = rows[0]; const columns = detectColumns(header); const fullName = (columns as any).__fullName; const fullGuardian = (columns as any).__fullGuardian;
  const get = (r: string[], f: ImportField) => (columns[f] !== undefined ? r[columns[f]!] ?? "" : "");
  const splitName = (s: string) => { const parts = s.trim().split(/\s+/); return parts.length > 1 ? [parts.slice(0, -1).join(" "), parts[parts.length - 1]] : [parts[0] ?? "", ""]; };
  const seen = new Set<string>();
  const records = rows.slice(1).map((r, i) => {
    let first = get(r, "first"), last = get(r, "last"); if (fullName) [first, last] = splitName(first);
    let gFirst = get(r, "guardianFirst"), gLast = get(r, "guardianLast"); if (fullGuardian) [gFirst, gLast] = splitName(gFirst); if (!gLast && gFirst) gLast = last;
    const email = get(r, "guardianEmail").toLowerCase(); const phone = get(r, "guardianPhone"); const birthDate = normalizeDate(get(r, "birthDate")); const divName = get(r, "division"); const jerseyRaw = get(r, "jersey"); const batsRaw = get(r, "bats").toUpperCase(); const throwsRaw = get(r, "throws").toUpperCase();
    const problems: string[] = []; const warnings: string[] = [];
    if (!first || !last) problems.push("Player name is missing."); if (!birthDate) problems.push(get(r, "birthDate") ? `Birth date "${get(r, "birthDate")}" was not understood (use YYYY-MM-DD or M/D/YYYY).` : "Birth date is missing.");
    if (!email) warnings.push("No guardian email; the family cannot sign in until one is added."); else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problems.push(`Email "${email}" is not valid.`);
    if (!gFirst) warnings.push("No guardian name; the player's last name is used.");
    const age = birthDate ? leagueAge(birthDate, eligibility) : null; if (age !== null && (age < 3 || age > 18)) problems.push(`League age ${age} is outside 3–18; check the birth date.`);
    let divisionId: string | null = null; if (divName) { const d = divisions.find((x) => x.name.toLowerCase() === divName.toLowerCase() || x.shortName.toLowerCase() === divName.toLowerCase()); if (d) { divisionId = d.id; if (age !== null && (age < d.minLeagueAge || age > d.maxLeagueAge)) warnings.push(`League age ${age} is outside ${d.name} (${d.minLeagueAge}–${d.maxLeagueAge}).`); } else warnings.push(`Division "${divName}" not found; left unassigned.`); }
    if (!divisionId && age !== null) { const el = eligibleDivisions(age, divisions); if (el.length === 1) divisionId = el[0].id; else if (el.length === 0) warnings.push(`No division accepts league age ${age}.`); }
    const key = `${first}|${last}|${birthDate}`.toLowerCase(); if (seen.has(key)) problems.push("Duplicate of an earlier row."); seen.add(key);
    if (birthDate && existing.players.some((p) => p.firstName.toLowerCase() === first.toLowerCase() && p.lastName.toLowerCase() === last.toLowerCase() && p.birthDate === birthDate)) warnings.push("Already in the league; this row will be skipped.");
    if (email && existing.emails.has(email)) warnings.push("Guardian email already has an account; the player is added to that family.");
    const jersey = jerseyRaw && /^\d{1,2}$/.test(jerseyRaw) ? Number(jerseyRaw) : null;
    return { row: i + 2, first, last, birthDate, leagueAge: age, guardianFirst: gFirst || (last ? `${last} family` : ""), guardianLast: gLast || last, guardianEmail: email, guardianPhone: phone, divisionName: divName, divisionId, jersey, bats: batsRaw === "L" ? "L" : batsRaw === "S" ? "S" : "R", throws: throwsRaw === "L" ? "L" : "R", problems, warnings } as ImportRecord;
  });
  return { records, columns, header };
}
export const IMPORT_TEMPLATE = "first,last,birthDate,guardianFirst,guardianLast,guardianEmail,guardianPhone,division\nJordan,Example,2017-04-12,Sam,Example,sam.example@example.com,(555) 010-0000,Minor\n";

/** Presets for the registration systems Little Leagues export from. The column names follow each system's standard
    player export; a league whose export differs renames the header row and the alias table above still matches. */
export interface ImportPreset { id: string; label: string; note: string; template: string; signature: string[]; }
export const IMPORT_PRESETS: ImportPreset[] = [
  { id: "generic", label: "Generic spreadsheet", note: "Any CSV with a header row. Columns are matched by name.", template: IMPORT_TEMPLATE, signature: [] },
  { id: "sportsconnect", label: "Sports Connect (Little League Central Registration)", note: "Little League's registration platform through the 2027 season. Export the season's participants with parent 1 details and the program column.", template: "Participant First Name,Participant Last Name,Participant Date of Birth,Parent 1 First Name,Parent 1 Last Name,Parent 1 Email,Parent 1 Cell Phone,Program Name\nJordan,Example,04/12/2017,Sam,Example,sam.example@example.com,(555) 010-0000,Minor\n", signature: ["participant first name", "parent 1 first name"] },
  { id: "playmetrics", label: "PlayMetrics", note: "The platform Little League has chosen for Central Registration after Sports Connect. Export players with the primary contact and program columns.", template: "Player First Name,Player Last Name,Player Date of Birth,Primary Contact First Name,Primary Contact Last Name,Primary Contact Email,Primary Contact Phone,Program\nJordan,Example,2017-04-12,Sam,Example,sam.example@example.com,555-010-0000,Minor\n", signature: ["player first name", "primary contact first name"] },
];
/** Recognises which system a header row came from. */
export function detectPreset(header: string[]): ImportPreset { const norm = header.map((h) => h.toLowerCase().replace(/[_\-.]/g, " ").replace(/\s+/g, " ").trim()); return IMPORT_PRESETS.find((p) => p.signature.length > 0 && p.signature.every((s) => norm.includes(s))) ?? IMPORT_PRESETS[0]; }
