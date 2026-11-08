import { useMemo, useState } from "react";
import { Badge, Button, Chips, Empty, Notice, Page, PageHead, Seg, Stat } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession } from "../../core/hooks";
import { navigate } from "../../core/router";
import { actions, run } from "../../core/actions";
import { fmtDateTime, fmtTime, relativeDay } from "../../core/dates";
import { categoryOf, CATEGORY_LABEL, resolveLink, ruleFor, type NotifyCategory } from "../../engines/notify";
import { nowIso } from "../../core/util";
import type { Notification } from "../../core/types";

const ICON: Record<NotifyCategory, keyof typeof I> = { schedule: "calendar", messages: "message", assignments: "parents", registration: "list", volunteer: "shield", fundraising: "dollar", development: "academy", tryouts: "clipboard", safety: "shield", league: "megaphone" };
export function openNotification(n: Notification) { if (!n.read) void run(() => actions.markNotificationRead(n.id)); const r = resolveLink(n.link); navigate(r.name, r.id); }
export function NotificationsPage() {
  const ss = useSession(); const t = ss.tenant!; const [filter, setFilter] = useState<"all" | "unread">("all"); const [cat, setCat] = useState<NotifyCategory | null>(null); const now = nowIso();
  const mine = useMemo(() => t.notifications.filter((n) => n.userId === ss.userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [t.notifications, ss.userId]);
  const unread = mine.filter((n) => !n.read).length; const cats = [...new Set(mine.map((n) => categoryOf(n.kind)))] as NotifyCategory[];
  const shown = mine.filter((n) => (filter === "all" || !n.read) && (!cat || categoryOf(n.kind) === cat));
  const groups = useMemo(() => { const m = new Map<string, Notification[]>(); for (const n of shown) { const k = n.createdAt.slice(0, 10); (m.get(k) ?? m.set(k, []).get(k)!).push(n); } return [...m.entries()]; }, [shown]);
  const deferred = mine.filter((n) => (n as any).deliverAt && (n as any).deliverAt > now).length; const comms = t.league.settings.communications;
  return <Page narrow><PageHead eyebrow="Notification center" title={unread ? `${unread} unread` : "You are caught up"} lede={`Everything the league, your teams and your coaches have sent you. Quiet hours are ${comms.quietHoursStart} to ${comms.quietHoursEnd}; non-urgent messages wait until morning for email and push, and always appear here.`} actions={<>{unread > 0 && <Button variant="primary" icon={<I.check size={16} />} onClick={() => run(() => actions.markNotificationsRead(), "All marked as read.")}>Mark all read</Button>}<Button onClick={() => navigate("account")}>Preferences</Button></>} />
    <div className="stats"><Stat label="Unread" value={unread} tone={unread ? "clay" : "grass"} /><Stat label="This week" value={mine.filter((n) => Date.now() - new Date(n.createdAt).getTime() < 7 * 86400000).length} /><Stat label="Waiting for morning" value={deferred} hint="held by quiet hours" tone={deferred ? "gold" : undefined} /><Stat label="Topics" value={cats.length} /></div>
    <div className="flex gap-3 wrap items-center"><Seg label="Filter" options={[{ id: "all", label: "All" }, { id: "unread", label: `Unread${unread ? ` · ${unread}` : ""}` }]} value={filter} onChange={setFilter} />{cats.length > 1 && <Chips label="Topic" options={cats.map((c) => ({ id: c, label: CATEGORY_LABEL[c] }))} value={cat} onChange={setCat} />}</div>
    {groups.length === 0 ? <Empty icon={<I.bell size={28} />} title={filter === "unread" ? "No unread notifications" : "Nothing yet"} body="Schedule changes, messages, assignments, duties and report cards arrive here." /> : groups.map(([day, list]) => <div key={day} className="col gap-2"><div className="eyebrow">{relativeDay(day)}</div><div className="list">{list.map((n) => { const c = categoryOf(n.kind); const Icon = I[ICON[c]]; const held = (n as any).deliverAt && (n as any).deliverAt > now; return <button key={n.id} className={`list-item clickable notif-row ${n.read ? "" : "unread"}`} style={{ background: "none", border: 0, width: "100%", textAlign: "left", font: "inherit", color: "inherit" }} onClick={() => openNotification(n)}><span className={`notif-icon ${c}`}><Icon size={18} /></span><span className="grow col" style={{ minWidth: 0 }}><span className="list-item-title">{n.title}</span><span className="list-item-sub">{n.body}</span><span className="xsmall faint">{fmtTime(n.createdAt)} · {CATEGORY_LABEL[c]}{ruleFor(n.kind).urgent ? " · urgent" : ""}{held ? ` · email and push at ${fmtDateTime((n as any).deliverAt)}` : ""}</span></span>{!n.read && <Badge tone="stitch" dot>new</Badge>}<I.chevronRight size={16} className="faint" /></button>; })}</div></div>)}
    {mine.length > 0 && <Notice kind="info">Notifications older than the newest 60 are trimmed automatically. Email and SMS delivery follow your preferences once the league connects those providers; the in-app record here is always complete.</Notice>}
  </Page>;
}
