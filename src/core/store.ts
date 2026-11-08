import { useSyncExternalStore } from "react";
import type { ContentBundle, DemoBundle, Membership } from "./types";
import type { Route } from "./router";

export type CollectionName =
  | "leagues" | "users" | "memberships" | "seasons" | "divisions" | "teams" | "players" | "registrations" | "payments" | "expenses" | "fields" | "events" | "attendance" | "pitching"
  | "volunteers" | "shifts" | "sponsors" | "fundraisers" | "announcements" | "threads" | "notifications" | "completions" | "assignments" | "iqProgress" | "awards" | "enrollments" | "notes"
  | "practicePlans" | "videos" | "favorites" | "playlists" | "siteContent" | "lessons" | "iqQuestions" | "curricula" | "audit" | "plans" | "consentLog" | "scenarios" | "guideProgress" | "drillVideos"
  | "tryouts" | "evaluations" | "drafts" | "reportCards" | "gameSheets";
export const TENANT_COLLECTIONS: CollectionName[] = ["leagues", "users", "memberships", "seasons", "divisions", "teams", "players", "registrations", "payments", "expenses", "fields", "events", "attendance", "pitching", "volunteers", "shifts", "sponsors", "fundraisers", "announcements", "threads", "notifications", "completions", "assignments", "iqProgress", "awards", "enrollments", "notes", "practicePlans", "videos", "favorites", "playlists", "siteContent", "lessons", "iqQuestions", "curricula", "audit", "consentLog", "scenarios", "guideProgress", "drillVideos", "tryouts", "evaluations", "drafts", "reportCards", "gameSheets"];
export const PLATFORM_COLLECTIONS: CollectionName[] = ["plans", "leagues", "audit"];

export type Overlay = Record<string, any>; // docId -> document (with optional _deleted tombstone)
export type Overlays = Partial<Record<CollectionName, Overlay>>;
export interface Toast { id: string; text: string; kind: "info" | "success" | "error"; }
export interface Session { personaId: string; userId: string; leagueId: string | null; }
export interface PersistenceStatus { mode: "artifact-db" | "local" | "memory"; status: "connecting" | "live" | "stale" | "offline" | "error"; message?: string; }
export interface ViewerInfo { id: string | null; name: string; isOwner: boolean; canEdit: boolean; canWriteData: boolean | null; }
export interface AppState {
  booted: boolean; bootError?: string;
  content: ContentBundle | null; demo: DemoBundle | null;
  tenantOverlays: Overlays; platformOverlays: Overlays; overlayTenantId: string | null;
  session: Session | null; route: Route;
  persistence: PersistenceStatus; viewer: ViewerInfo | null;
  caps: { db: boolean; user: boolean; sample: boolean; assets: boolean; downloads: boolean; resolved: boolean };
  ui: { railOpen: boolean; toasts: Toast[]; theme: "system" | "light" | "dark"; activeChildId: string | null };
}

type Listener = () => void;
let state: AppState = {
  booted: false, content: null, demo: null, tenantOverlays: {}, platformOverlays: {}, overlayTenantId: null, session: null,
  route: { name: "home", raw: "home" }, persistence: { mode: "memory", status: "connecting" }, viewer: null,
  caps: { db: false, user: false, sample: false, assets: false, downloads: false, resolved: false },
  ui: { railOpen: false, toasts: [], theme: "system", activeChildId: null },
};
const listeners = new Set<Listener>();
export const store = {
  get: () => state,
  set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) { const p = typeof patch === "function" ? patch(state) : patch; state = { ...state, ...p }; for (const l of listeners) l(); },
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
  setOverlayDocs(scope: "tenant" | "platform", col: CollectionName, docs: Overlay, replace = false) {
    store.set((s) => { const key = scope === "tenant" ? "tenantOverlays" : "platformOverlays"; const prev = s[key][col] ?? {}; const next = replace ? docs : { ...prev, ...docs }; return { [key]: { ...s[key], [col]: next } } as Partial<AppState>; });
  },
  toast(text: string, kind: Toast["kind"] = "info") { const id = Math.random().toString(36).slice(2); store.set((s) => ({ ui: { ...s.ui, toasts: [...s.ui.toasts, { id, text, kind }] } })); setTimeout(() => store.set((s) => ({ ui: { ...s.ui, toasts: s.ui.toasts.filter((t) => t.id !== id) } })), 3800); },
};
export function useAppState<T>(selector: (s: AppState) => T): T { return useSyncExternalStore(store.subscribe, () => selector(state), () => selector(state)); }
export function useAppStore(): AppState { return useSyncExternalStore(store.subscribe, () => state, () => state); }
export function currentMemberships(s: AppState = state): Membership[] {
  if (!s.session || !s.demo) return [];
  const seed = s.demo.memberships; const ov = s.tenantOverlays.memberships ?? {}; const pov = s.platformOverlays.memberships ?? {};
  const all: Membership[] = [...seed.filter((m) => !ov[m.id] && !pov[m.id]), ...Object.values(ov).filter((d) => !d._deleted), ...Object.values(pov).filter((d) => !d._deleted)];
  return all.filter((m) => m.userId === s.session!.userId);
}
