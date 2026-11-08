import { useMemo, useState } from "react";
import { Badge, Button, Card, Chips, CopyBox, Empty, Modal, Notice, Page, PageHead, Seg, StatusBadge } from "../../components/ui";
import { I } from "../../components/icons";
import { useSession } from "../../core/hooks";
import { navigate } from "../../core/router";
import { MonthGrid, Agenda } from "../../components/Calendar";
import { eventTitle, eventSubtitle } from "./eventText";
import { buildIcs } from "../../engines/ics";
import { capability } from "../../core/capabilities";
import { store } from "../../core/store";
import { startOfMonth } from "../../core/dates";
export function SchedulePage() {
  const ss = useSession(); const t = ss.tenant!; const [view, setView] = useState<"agenda" | "month">("agenda"); const [month, setMonth] = useState(startOfMonth(new Date())); const [scope, setScope] = useState<"mine" | "league">(ss.teams.length ? "mine" : "league"); const [type, setType] = useState<string | null>(null); const [divId, setDivId] = useState<string | null>(null); const [ics, setIcs] = useState<string | null>(null);
  const myTeamIds = new Set(ss.teams.map((x) => x.id)); const mineEvents = (e: typeof t.events[number]) => e.teamIds.some((id) => myTeamIds.has(id)) || (ss.role === "umpire" && e.umpireUserIds.includes(ss.userId)) || e.type === "clinic" || e.type === "event";
  const events = useMemo(() => t.events.filter((e) => (scope === "league" || mineEvents(e)) && (!type || e.type === type) && (!divId || e.divisionId === divId)).map((e) => ({ event: e, title: eventTitle(e, t), subtitle: eventSubtitle(e, t) })), [t.events, scope, type, divId, ss.teams]);
  const exportIcs = async () => { const text = buildIcs(events.map((x) => x.event), (e) => eventTitle(e, t), (e) => t.fieldById.get(e.fieldId ?? "")?.name ?? "", `${t.league.shortName} ${scope === "mine" ? "family" : "league"} schedule`); const dl = capability().downloads; if (dl) { try { await dl.save({ filename: `${t.league.slug}-schedule.ics`, data: text }); store.toast("Calendar file saved. Import it into Google, Apple or Outlook calendar.", "success"); return; } catch (e: any) { if (e?.code === "declined") return; } } setIcs(text); };
  const fieldsNotOpen = t.fields.filter((f) => f.status !== "open");
  return <Page>
    <PageHead eyebrow={`${t.league.name} · ${t.activeSeason?.name}`} title={scope === "mine" ? "Your family's schedule" : "League schedule"} lede={scope === "mine" ? "Only the games, practices and events for your teams." : "Every division, every field."} actions={<><Seg label="View" options={[{ id: "agenda", label: "Agenda" }, { id: "month", label: "Month" }]} value={view} onChange={setView} /><Button icon={<I.download size={16} />} onClick={exportIcs}>Export calendar</Button></>} />
    {fieldsNotOpen.length > 0 && <Notice kind="warn"><strong>Field status:</strong> {fieldsNotOpen.map((f) => `${f.name} ${f.status.replace("_", " ")}`).join(" · ")}. <button className="link-btn" onClick={() => navigate("league", "fields")}>Details</button></Notice>}
    <div className="flex gap-3 wrap items-center">{ss.teams.length > 0 && <Seg label="Scope" options={[{ id: "mine", label: "My teams" }, { id: "league", label: "Whole league" }]} value={scope} onChange={setScope} />}<Chips label="Type" options={[{ id: "game", label: "Games" }, { id: "practice", label: "Practices" }, { id: "clinic", label: "Clinics" }, { id: "event", label: "Events" }]} value={type} onChange={setType} />{scope === "league" && <Chips label="Division" options={t.divisions.map((d) => ({ id: d.id, label: d.shortName }))} value={divId} onChange={setDivId} />}</div>
    {view === "agenda" ? <Agenda events={events} onEvent={(e) => navigate("event", e.id)} limitDays={45} emptyText={scope === "mine" ? "No family events coming up" : "Nothing scheduled"} /> : <MonthGrid events={events} month={month} onMonth={setMonth} onEvent={(e) => navigate("event", e.id)} />}
    <Card title="Subscribe from your phone"><p className="small muted">Export downloads an .ics file you can import into Google, Apple or Outlook calendars. A live subscription link (auto-updating) requires the hosted deployment described in docs/DEPLOYMENT.md.</p></Card>
    {ics && <Modal title="Calendar file" onClose={() => setIcs(null)}><p className="small muted mb-2">Downloads are not available in this viewer. Copy the text below into a file named schedule.ics and import it into your calendar.</p><CopyBox text={ics} label="Copy .ics" /></Modal>}
  </Page>;
}
