import { useEffect, useMemo, useState, type ReactNode } from "react";
import { I } from "../../components/icons";
import { Avatar, Badge, Button, IconButton, Modal, SearchInput, TeamMark, Toasts } from "../../components/ui";
import { store, useAppStore, currentMemberships } from "../../core/store";
import { useTenant } from "../../core/select";
import { navigate } from "../../core/router";
import { ADMIN_NAV, MAIN_NAV, MOBILE_TABS, visibleAdminNav } from "../nav";
import { ROLE_LABELS } from "../../core/rbac";
import { auth } from "../../core/auth";
import { cx, safeLocalSet } from "../../core/util";
import { actions, run } from "../../core/actions";
import { fmtDateTime } from "../../core/dates";
import { Logo } from "../../components/Brand";
import { currentRoute } from "../../core/router";
import { openNotification } from "../../features/account/NotificationsPage";
import { ResetDemoModal } from "../../features/auth/DemoGuidePage";

export function AppShell({ children }: { children: ReactNode }) {
  const s = useAppStore(); const t = useTenant(); const [switcher, setSwitcher] = useState(false); const [notif, setNotif] = useState(false); const [q, setQ] = useState("");
  const memberships = currentMemberships(s); const persona = s.demo?.personas.find((p) => p.id === s.session?.personaId); const user = t?.userById.get(s.session?.userId ?? "");
  const adminNav = t ? visibleAdminNav(memberships, t.leagueId) : []; const isPlatform = memberships.some((m) => m.role === "platform_admin");
  const route = s.route; const active = (r: string) => route.name === r || (r !== "home" && route.raw.startsWith(r + "-") && !route.raw.startsWith("admin") && r !== "admin") || (r.startsWith("admin") && route.raw === r);
  const unread = t ? t.notifications.filter((n) => n.userId === s.session?.userId && !n.read).length : 0;
  const myNotifs = t ? t.notifications.filter((n) => n.userId === s.session?.userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 6) : [];
  const closeRail = () => store.set((x) => ({ ui: { ...x.ui, railOpen: false } }));
  useEffect(() => { closeRail(); }, [route.raw]);
  const go = (r: string) => { navigate(r); closeRail(); };
  const toggleTheme = () => { const order = ["system", "light", "dark"] as const; const next = order[(order.indexOf(s.ui.theme) + 1) % 3]; applyTheme(next); };
  return <div className="app">
    {s.ui.railOpen && <div className="mobile-rail-scrim" onClick={closeRail} />}
    <aside className={cx("rail", s.ui.railOpen && "open")} aria-label="Main navigation">
      <div className="rail-brand"><Logo on="dark" height={20} /><button className="btn btn-ghost btn-icon show-mobile" style={{ marginLeft: "auto", color: "inherit" }} onClick={closeRail} aria-label="Close menu"><I.close /></button></div>
      {t && <button className="rail-league" onClick={() => setSwitcher(true)} style={{ background: "none", border: 0, borderBottom: "1px solid var(--chrome-active)", color: "inherit", width: "100%", textAlign: "left", cursor: "pointer" }} aria-label="Switch league or role"><TeamMark src={t.league.logoAssetId ? `/_blob/${t.league.logoAssetId}` : undefined} name={t.league.shortName} color={t.league.colors.primary} abbr={t.league.logoText} size={32} /><span className="grow col" style={{ minWidth: 0 }}><span className="rail-league-name truncate">{t.league.name}</span><span className="rail-league-sub">{t.activeSeason?.name} · {persona ? ROLE_LABELS[persona.role].split(" / ")[0] : ""}</span></span><I.switch size={16} className="faint" /></button>}
      <nav className="rail-nav">
        {MAIN_NAV.map((n) => { const Icon = I[n.icon]; return <button key={n.id} className="nav-item" aria-current={active(n.route) ? "page" : undefined} onClick={() => go(n.route)}><Icon size={18} />{n.label}{n.id === "notifications" && unread > 0 && <span className="count">{unread}</span>}</button>; })}
        {adminNav.length > 0 && <><div className="rail-section">Administration</div>{adminNav.map((n) => { const Icon = I[n.icon]; return <button key={n.id} className="nav-item" aria-current={route.raw === n.route ? "page" : undefined} onClick={() => go(n.route)}><Icon size={18} />{n.label}</button>; })}</>}
        {isPlatform && <><div className="rail-section">Platform</div><button className="nav-item" aria-current={route.name === "platform" ? "page" : undefined} onClick={() => go("platform")}><I.sliders size={18} />Super administrator</button></>}
        <div className="rail-section">Public</div>
        {t && <button className="nav-item" onClick={() => go(`site-${t.league.slug}`)}><I.external size={18} />League website</button>}
        <button className="nav-item" onClick={() => go("marketing")}><I.diamond size={18} />About GamePlanIQ</button>
        <button className="nav-item" aria-current={route.raw === "demo-guide" ? "page" : undefined} onClick={() => go("demo-guide")}><I.play size={18} />Presenter guide</button>
      </nav>
      <div className="rail-foot"><span className={cx("badge", s.persistence.status === "live" ? "badge-grass" : s.persistence.status === "connecting" ? "badge-gold" : "badge-stitch")} title={s.persistence.message}>{s.persistence.mode === "artifact-db" ? "Shared database" : s.persistence.mode === "local" ? "This browser only" : "This visit only"} · {s.persistence.status}</span><span>Demo league data is fictional.</span></div>
    </aside>
    <header className="topbar">
      <IconButton label="Open menu" className="rail-toggle" onClick={() => store.set((x) => ({ ui: { ...x.ui, railOpen: !x.ui.railOpen } }))}><I.menu /></IconButton>
      <SearchInput id="global-search" value={q} onChange={setQ} placeholder="Search lessons, drills, guides, rules…" onSubmit={() => { if (q.trim()) { store.set((x) => ({ ui: { ...x.ui, searchQuery: q.trim() } as any })); navigate("search"); } }} />
      <div className="topbar-actions">
        <IconButton label={`Theme: ${s.ui.theme}`} onClick={toggleTheme}>{s.ui.theme === "dark" ? <I.moon /> : s.ui.theme === "light" ? <I.sun /> : <I.sliders />}</IconButton>
        <div style={{ position: "relative" }}><IconButton label={`Notifications${unread ? ` (${unread} unread)` : ""}`} onClick={() => setNotif(!notif)}><I.bell />{unread > 0 && <span className="count" style={{ position: "absolute", top: 2, right: 2, background: "var(--stitch)", color: "#fff", borderRadius: 999, fontSize: ".65rem", padding: "0 .35rem", fontWeight: 700 }}>{unread}</span>}</IconButton>
          {notif && <div className="card" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: "min(360px, 90vw)", zIndex: 60, padding: ".5rem" }} role="dialog" aria-label="Notifications"><div className="flex items-center justify-between" style={{ padding: ".25rem .5rem" }}><strong>Notifications</strong><span className="flex gap-2">{unread > 0 && <button className="link-btn small" onClick={() => run(() => actions.markNotificationsRead())}>Mark all read</button>}<button className="link-btn small" onClick={() => { setNotif(false); navigate("notifications"); }}>See all</button></span></div>
            <div className="list" style={{ maxHeight: 360, overflow: "auto" }}>{myNotifs.length === 0 && <div className="empty" style={{ padding: "1.2rem" }}><p className="small">You are all caught up.</p></div>}{myNotifs.map((n) => <button key={n.id} className="list-item clickable" style={{ width: "100%", background: "none", border: 0, textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => { setNotif(false); openNotification(n); }}><span className={cx("badge-dot", !n.read ? "badge badge-stitch" : "badge")} style={{ padding: 0, width: 8, height: 8 }} /><span className="grow col" style={{ minWidth: 0 }}><span className="list-item-title truncate">{n.title}</span><span className="list-item-sub">{n.body}</span><span className="xsmall faint">{fmtDateTime(n.createdAt)}</span></span></button>)}</div></div>}
        </div>
        {persona && user && <button className="persona" onClick={() => setSwitcher(true)} aria-label="Switch role or sign out"><Avatar first={user.firstName} last={user.lastName} size="sm" /><span className="persona-text col"><span className="persona-name truncate">{user.firstName} {user.lastName}</span><span className="persona-role">{ROLE_LABELS[persona.role].split(" / ")[0]}</span></span><I.chevronDown size={14} className="faint hide-mobile" /></button>}
      </div>
    </header>
    <main className="main" id="main">{children}</main>
    <nav className="tabbar" aria-label="Quick navigation">{MOBILE_TABS.map((id) => { const n = MAIN_NAV.find((x) => x.id === id)!; const Icon = I[n.icon]; return <button key={id} aria-current={active(n.route) ? "page" : undefined} onClick={() => go(n.route)}><Icon />{n.label.replace("Player ", "")}{id === "messages" && unread > 0 && <span className="sr-only">{unread} unread</span>}</button>; })}<button onClick={() => store.set((x) => ({ ui: { ...x.ui, railOpen: true } }))} aria-label="More"><I.menu />More</button></nav>
    <Toasts />
    {switcher && <PersonaSwitcher onClose={() => setSwitcher(false)} />}
  </div>;
}
export function applyTheme(theme: "system" | "light" | "dark") { const root = document.documentElement; if (theme === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", theme); safeLocalSet("gameplaniq:v1:theme", theme); store.set((x) => ({ ui: { ...x.ui, theme } })); }
export function PersonaSwitcher({ onClose }: { onClose: () => void }) {
  const s = useAppStore(); const personas = s.demo?.personas ?? []; const ln = s.demo?.leagues[0]?.shortName ?? "League"; const [reset, setReset] = useState(false); const groups = useMemo(() => [{ title: `${ln} family`, ids: ["persona_parent", "persona_player"] }, { title: `${ln} coaches`, ids: ["persona_coach", "persona_assistant"] }, { title: `${ln} league staff`, ids: ["persona_admin", "persona_board", "persona_commissioner", "persona_umpire", "persona_volunteer"] }, { title: "Platform and other leagues", ids: ["persona_platform", "persona_harbor"] }], [ln]);
  return <Modal title="Switch demo role" onClose={onClose} large footer={<><Button variant="ghost" icon={<I.logout size={16} />} onClick={() => { auth().signOut(); onClose(); navigate("home"); }}>Sign out</Button><Button variant="ghost" icon={<I.refresh size={16} />} onClick={() => setReset(true)}>Reset demo data</Button><Button variant="ghost" icon={<I.play size={16} />} onClick={() => { onClose(); navigate("demo", "guide"); }}>Presenter guide</Button><Button onClick={onClose}>Done</Button></>}>
    <p className="muted small mb-4">Every persona is fictional. Switching roles shows exactly what that person can see and do; permissions are enforced on every action, not just hidden in the menu.</p>
    {reset && <ResetDemoModal onClose={() => setReset(false)} />}
    <div className="col gap-4">{groups.map((g) => <div key={g.title}><div className="eyebrow mb-2">{g.title}</div><div className="cards-2">{g.ids.map((id) => personas.find((p) => p.id === id)).filter(Boolean).map((p) => { const u = s.demo!.users.find((x) => x.id === p!.userId)!; const current = s.session?.personaId === p!.id; return <button key={p!.id} className={cx("option", current && "on")} aria-pressed={current} onClick={() => { signInPersona(p!.id); onClose(); }}><span className="flex items-center gap-3"><Avatar first={u.firstName} last={u.lastName} /><span className="col grow" style={{ minWidth: 0 }}><strong>{p!.label}</strong><span>{ROLE_LABELS[p!.role]}</span></span>{current && <Badge tone="grass">Current</Badge>}</span><span className="small" style={{ color: "var(--fg-muted)" }}>{p!.description}</span></button>; })}</div></div>)}</div>
  </Modal>;
}
/** One-click demo entry: signs in as the parent persona so anyone with the link can explore, then lands on Home. */
export function enterDemoMode() { auth().signInAs("persona_parent"); const p = store.get().demo?.personas.find((x) => x.id === "persona_parent"); store.toast(`Demo mode: you are ${p?.label ?? "a parent"}, a parent. Switch roles any time from the top right.`, "info"); navigate("home"); }
export function signInPersona(id: string) { const s = auth().signInAs(id); if (s && !s.leagueId) store.set((x) => ({ session: { ...x.session!, leagueId: x.demo?.leagues[0]?.id ?? null } })); const r = currentRoute(); if (r.name === "home" || r.name === "marketing" || r.name === "pricing" || r.name === "directory" || r.name === "site") navigate("home"); }
