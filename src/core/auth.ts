/* Authentication abstraction. The artifact build ships a DemoAuthProvider: the viewer picks a fictional persona and the app
   enforces that persona's memberships through RBAC. Production swaps in a real provider (see docs/DEPLOYMENT.md). */
import type { DemoBundle, Persona } from "./types";
import { store, type Session } from "./store";
import { safeLocalGet, safeLocalSet, safeLocalRemove } from "./util";

export interface AuthProvider { restore(): Session | null; signInAs(personaId: string): Session | null; signOut(): void; personas(): Persona[]; }
const KEY = "gameplaniq:v1:session";
export function createDemoAuth(demo: DemoBundle): AuthProvider {
  const personas = demo.personas;
  const toSession = (p: Persona): Session => ({ personaId: p.id, userId: p.userId, leagueId: p.leagueId });
  return {
    personas: () => personas,
    restore() { const raw = safeLocalGet(KEY); if (!raw) return null; const p = personas.find((x) => x.id === raw); return p ? toSession(p) : null; },
    signInAs(personaId) { const p = personas.find((x) => x.id === personaId); if (!p) return null; safeLocalSet(KEY, personaId); const s = toSession(p); store.set({ session: s }); return s; },
    signOut() { safeLocalRemove(KEY); store.set({ session: null }); },
  };
}
let authRef: AuthProvider | null = null;
export const setAuth = (a: AuthProvider) => { authRef = a; };
export const auth = () => { if (!authRef) throw new Error("auth not initialised"); return authRef; };
