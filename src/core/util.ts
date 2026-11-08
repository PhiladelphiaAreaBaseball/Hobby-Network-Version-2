export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");
export function newId(prefix: string): string {
  const rnd = (globalThis.crypto && "randomUUID" in globalThis.crypto) ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 10) : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${rnd}`;
}
export const nowIso = () => new Date().toISOString().slice(0, 19);
export const todayIso = () => new Date().toISOString().slice(0, 10);
export function initials(first: string, last?: string) { return `${(first || "?")[0] ?? ""}${(last || "")[0] ?? ""}`.toUpperCase(); }
export function plural(n: number, one: string, many?: string) { return `${n} ${n === 1 ? one : (many ?? one + "s")}`; }
export const money = (n: number) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
export const money2 = (n: number) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));
export function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
export function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K): Record<K, T[]> { const out = {} as Record<K, T[]>; for (const a of arr) { const k = key(a); (out[k] ||= []).push(a); } return out; }
export function uniq<T>(arr: T[]) { return [...new Set(arr)]; }
export function sortBy<T>(arr: T[], key: (t: T) => string | number, dir: "asc" | "desc" = "asc") { return [...arr].sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * (dir === "asc" ? 1 : -1); }); }
export function titleCase(s: string) { return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
export function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; }
export function safeLocalGet(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
export function safeLocalSet(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } }
export function safeLocalRemove(key: string) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
export function hashColor(seed: string) { let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0; const hues = [212, 198, 162, 20, 32, 280, 340, 120]; return `hsl(${hues[h % hues.length]} 48% 42%)`; }
export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) { let t: any; return (...a: Parameters<T>) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
export async function copyText(text: string): Promise<boolean> { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }
