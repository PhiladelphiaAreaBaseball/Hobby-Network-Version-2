/* Hash router. The artifact host passes only plain `#name` hashes (letters, digits, hyphens), so routes are flat tokens
   like `lesson-hit-01` or `admin-schedule` and we parse by known prefixes. */
export interface Route { name: string; id?: string; raw: string; }
const PREFIXED = ["demo", "gameplan", "tournament", "form", "tryout", "draft", "report", "gameday", "run", "cert", "notifications", "allstars", "recap", "survey", "season", "view", "lesson", "guide", "team", "player", "curriculum", "iq-lesson", "iq-quiz", "resource", "thread", "site", "practice-plan", "coaches-team", "admin", "platform", "registration", "event", "academy", "coaches", "parents", "league", "messages", "account", "register", "iq", "practice", "schedule", "achievements", "resources", "glossary", "home", "pricing", "directory", "marketing", "search", "teams", "volunteer", "umpire", "privacy", "about"];
const RESERVED = new Set(["settings", "sidebar", "customize", "upgrade", "downloads"]);
export function parseRoute(hash: string): Route {
  let raw = (hash || "").replace(/^#/, "").trim();
  if (!raw || RESERVED.has(raw) || raw.startsWith("comment-")) raw = "home";
  // longest prefix first
  const sorted = [...PREFIXED].sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (raw === p) return { name: p, raw };
    if (raw.startsWith(p + "-")) return { name: p, id: raw.slice(p.length + 1), raw };
  }
  return { name: "home", raw };
}
export function routeHash(name: string, id?: string) { return "#" + (id ? `${name}-${id}` : name); }
export function navigate(name: string, id?: string) {
  const h = routeHash(name, id);
  if (location.hash === h) { window.dispatchEvent(new HashChangeEvent("hashchange")); return; }
  location.hash = h;
}
export function currentRoute(): Route { return parseRoute(location.hash); }
