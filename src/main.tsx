import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { store, type Session } from "./core/store";
import { loadContent, loadDemo } from "./core/data";
import { initCapabilities } from "./core/capabilities";
import { createDemoAuth, setAuth } from "./core/auth";
import { persistence } from "./core/persistence";
import { currentRoute } from "./core/router";
import { safeLocalGet } from "./core/util";
import { applyTheme } from "./app/shell/AppShell";

async function boot() {
  const theme = (safeLocalGet("gameplaniq:v1:theme") as any) || "system"; applyTheme(theme);
  store.set({ route: currentRoute() }); window.addEventListener("hashchange", () => { store.set({ route: currentRoute() }); window.scrollTo({ top: 0 }); });
  const root = createRoot(document.getElementById("root")!); root.render(<App />);
  try {
    const [content, demo] = await Promise.all([loadContent(), loadDemo(), initCapabilities()]);
    const authP = createDemoAuth(demo); setAuth(authP);
    const session = authP.restore(); if (session && !session.leagueId) session.leagueId = demo.leagues[0].id;
    store.set({ content, demo, session, booted: true });
    watchTenant(); persistence().startPlatform();
  } catch (e: any) { console.error(e); store.set({ booted: true, bootError: e?.message || "Could not load application data." }); }
}
let stopTenant: (() => void) | null = null; let lastLeague: string | null = null;
function watchTenant() {
  const sync = () => { const s = store.get(); const leagueId: string | null = s.session?.leagueId ?? s.demo?.leagues[0]?.id ?? null; if (leagueId === lastLeague) return; lastLeague = leagueId; stopTenant?.(); stopTenant = leagueId ? persistence().startTenant(leagueId) : null; };
  sync(); store.subscribe(sync);
}
export type { Session };
boot();
