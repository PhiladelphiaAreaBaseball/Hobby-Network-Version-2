/* Global search over approved content, announcements and public schedule. Tokenized, synonym-expanded, field-weighted.
   Natural-language parent questions ("my son is afraid of the baseball") land on the lessons tagged with those phrases. */
import type { AgeGroupId } from "../core/types";
export type SearchType = "lesson" | "guide" | "drill" | "iq_lesson" | "resource" | "glossary" | "announcement" | "event" | "coach_plan" | "curriculum";
export interface SearchDoc { id: string; type: SearchType; title: string; summary: string; text: string; tags: string[]; ageGroups: AgeGroupId[]; route: { name: string; id?: string }; category?: string; }
export interface SearchHit { doc: SearchDoc; score: number; }
const STOP = new Set(["the", "a", "an", "to", "of", "and", "or", "is", "are", "my", "our", "your", "his", "her", "their", "in", "on", "at", "for", "with", "how", "do", "i", "we", "you", "it", "this", "that", "be", "can", "what", "does", "should", "when", "about", "into", "from", "as", "by", "son", "daughter", "kid", "kids", "child", "children", "year", "old", "yr", "yo", "he", "she", "they", "them", "me", "us", "want", "wants", "need", "needs", "help", "please", "some", "any", "get", "got", "just", "really", "very", "keeps", "keep", "always"]);
const SYN: Record<string, string[]> = {
  afraid: ["fear", "scared", "confidence", "soft"], scared: ["afraid", "fear", "confidence"], fear: ["afraid", "scared"], nervous: ["confidence", "afraid"], flinch: ["afraid", "fear"],
  teach: ["learn", "introduce", "basics"], explain: ["rules", "learn"], learn: ["teach"], beginner: ["basics", "first", "new"], start: ["basics", "first", "beginner"],
  throw: ["throwing", "arm"], throwing: ["throw"], catch: ["catching", "glove", "receive"], catching: ["catch", "glove"], field: ["fielding", "ground"], fielding: ["field", "ground", "glove"],
  grounder: ["ground"], grounders: ["ground"], groundball: ["ground"], popup: ["fly", "pop"], popups: ["fly", "pop"], pop: ["fly"], flyball: ["fly"], hit: ["hitting", "bat", "swing", "contact"], hitting: ["hit", "bat", "swing"], bat: ["hitting", "swing"], batting: ["hitting", "swing", "stance"], swing: ["hitting", "bat"], tee: ["hitting"],
  run: ["running", "bases", "baserunning"], running: ["bases", "baserunning"], bases: ["baserunning", "running"], base: ["bases", "baserunning"], slide: ["sliding"], sliding: ["slide"],
  rule: ["rules"], rules: ["rule", "iq"], force: ["force", "out", "rules"], cutoff: ["cutoffs", "relay"], relay: ["relays", "cutoff"], position: ["positions"], positions: ["position"],
  driveway: ["driveway", "small", "space"], garage: ["indoor", "small"], indoor: ["garage", "small", "inside"], inside: ["indoor"], backyard: ["home", "yard"], yard: ["backyard"], home: ["backyard", "parent"],
  drill: ["drills", "practice"], drills: ["drill", "practice"], practice: ["drill", "home"], parent: ["parents", "guardian"], coach: ["coaching", "coaches"], pitch: ["pitching", "pitcher"], pitching: ["pitch", "arm", "rest"], arm: ["throwing", "pitching", "rest"],
  quit: ["struggling", "frustrated", "encourage", "fun"], hates: ["struggling", "fun", "encourage"], cry: ["struggling", "confidence", "encourage"], mistake: ["mistakes", "handling"], mistakes: ["mistake", "handling"], tired: ["fatigue"], fatigue: ["tired", "rest"],
  equipment: ["glove", "bat", "helmet", "gear"], gear: ["equipment"], umpire: ["umpires", "signals", "rules"], safe: ["safety"], safety: ["safe"], helmet: ["safety", "equipment"], concussion: ["safety", "head"],
};
function stem(w: string) { if (w.length <= 3) return w; return w.replace(/(ing|ers|er|ies|es|s|ed|ly)$/, (m) => (w.length - m.length >= 3 ? "" : m)); }
export function tokenize(q: string): string[] { return q.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).map((w) => w.replace(/^'+|'+$/g, "")).filter((w) => w && !STOP.has(w)).map(stem); }
function expand(tokens: string[]): Map<string, number> { const m = new Map<string, number>(); for (const t of tokens) { m.set(t, Math.max(m.get(t) ?? 0, 1)); for (const s of SYN[t] ?? []) m.set(stem(s), Math.max(m.get(stem(s)) ?? 0, 0.6)); } return m; }
interface Indexed { doc: SearchDoc; title: Set<string>; tags: Set<string>; tagPhrases: string[]; summary: Set<string>; text: Set<string>; }
export interface SearchIndex { items: Indexed[]; }
export function buildIndex(docs: SearchDoc[]): SearchIndex { return { items: docs.map((doc) => ({ doc, title: new Set(tokenize(doc.title)), tags: new Set(doc.tags.flatMap(tokenize)), tagPhrases: doc.tags.map((t) => t.toLowerCase()), summary: new Set(tokenize(doc.summary)), text: new Set(tokenize(doc.text)) })) }; }
export function search(index: SearchIndex, query: string, opts: { ageGroup?: AgeGroupId | null; types?: SearchType[]; limit?: number } = {}): SearchHit[] {
  const qn = query.toLowerCase().trim(); if (!qn) return [];
  const tokens = tokenize(query); const weights = expand(tokens); const hits: SearchHit[] = [];
  for (const it of index.items) {
    if (opts.types && !opts.types.includes(it.doc.type)) continue;
    let score = 0, covered = 0;
    for (const [tok, w] of weights) { let s = 0; if (it.title.has(tok)) s += 6; if (it.tags.has(tok)) s += 4; if (it.summary.has(tok)) s += 2; if (it.text.has(tok)) s += 1; if (s > 0) { score += s * w; if (w === 1) covered++; } }
    if (score === 0) continue;
    if (it.tagPhrases.some((p) => p.includes(qn) || qn.includes(p))) score += 10;
    if (it.doc.title.toLowerCase().includes(qn)) score += 8;
    if (tokens.length > 1) score *= 1 + covered / tokens.length; // reward covering the whole question
    if (opts.ageGroup && it.doc.ageGroups.length && it.doc.ageGroups.includes(opts.ageGroup)) score *= 1.3;
    hits.push({ doc: it.doc, score });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, opts.limit ?? 20);
}
