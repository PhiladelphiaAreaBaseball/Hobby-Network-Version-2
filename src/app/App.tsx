import { useAppStore } from "../core/store";
import { AppShell } from "./shell/AppShell";
import { WelcomePage } from "../features/auth/WelcomePage";
import { Notice, Page } from "../components/ui";
import { routeView } from "./routes";
export function App() {
  const s = useAppStore();
  if (!s.booted) return <div className="boot" role="status"><div className="boot-title">GamePlan<span style={{ color: "var(--primary)" }}>IQ</span></div><div className="boot-sub">Loading your league…</div></div>;
  if (s.bootError) return <div className="boot"><div className="boot-title">GamePlan<span style={{ color: "var(--primary)" }}>IQ</span></div><div className="boot-sub">{s.bootError}</div></div>;
  const view = routeView(s.route);
  if (view.frame === "public" || s.route.name === "demo") return <>{view.element}</>;
  if (!s.session) return <WelcomePage />;
  if (view.frame === "none") return <>{view.element}</>;
  return <AppShell>{view.element ?? <Page><Notice kind="warn">Page not found.</Notice></Page>}</AppShell>;
}
