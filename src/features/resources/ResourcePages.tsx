import { useState } from "react";
import { Badge, Button, Card, Chips, Empty, Link, Notice, Page, PageHead, SearchInput, Section } from "../../components/ui";
import { I } from "../../components/icons";
import { useContent, useSession } from "../../core/hooks";
import { navigate } from "../../core/router";
const CATS: { id: string; label: string }[] = [["rules", "Little League rules"], ["parent_guides", "Parent guides"], ["coach_guides", "Coach guides"], ["terminology", "Terminology"], ["player_safety", "Player safety"], ["concussion", "Concussion awareness"], ["throwing_safety", "Throwing safety"], ["pitch_count", "Pitch counts"], ["sportsmanship", "Sportsmanship"], ["nutrition", "Nutrition"], ["hydration", "Hydration"], ["heat_safety", "Heat safety"], ["volunteers", "Volunteers"], ["league_documents", "League documents"]].map(([id, label]) => ({ id, label }));
export function ResourcesPage({ category }: { category?: string }) {
  const content = useContent(); const ss = useSession(); const t = ss.tenant!; const [q, setQ] = useState(""); const [cat, setCat] = useState<string | null>(category ?? null); const [aud, setAud] = useState<string | null>(null);
  const items = content.resources.filter((r) => (!cat || r.category === cat) && (!aud || r.audience.includes(aud)) && (!q || `${r.title} ${r.summary} ${r.body.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  return <Page><PageHead eyebrow="Resource center" title="Rules, safety and how-to guides" lede="Plain-language summaries with links to the official sources. Where Little League materials are referenced, the current official publication is the authority." actions={<Button icon={<I.book size={16} />} onClick={() => navigate("glossary")}>Baseball glossary</Button>} />
    <SearchInput value={q} onChange={setQ} placeholder="Search resources" /><div className="flex gap-3 wrap"><Chips label="Category" options={CATS} value={cat} onChange={setCat} /></div><Chips label="Audience" options={[{ id: "parent", label: "Parents" }, { id: "coach", label: "Coaches" }, { id: "player", label: "Players" }, { id: "admin", label: "Administrators" }, { id: "umpire", label: "Umpires" }, { id: "volunteer", label: "Volunteers" }]} value={aud} onChange={setAud} />
    {t.siteContent.documents.length > 0 && (!cat || cat === "league_documents") && <Section title={`${t.league.shortName} documents`}><div className="cards-3">{t.siteContent.documents.map((d) => <Card key={d.title}><strong>{d.title}</strong><p className="small muted">{d.description}</p><span className="xsmall muted">{d.assetId ? "Available to league members" : "Upload pending by league staff"}</span></Card>)}</div></Section>}
    <div className="cards-3">{items.map((r) => <Card key={r.id} onClick={() => navigate("resource", r.id)}><div className="col gap-2"><div className="flex gap-2 wrap"><Badge tone="primary">{CATS.find((c) => c.id === r.category)?.label ?? r.category}</Badge>{r.audience.slice(0, 3).map((a) => <Badge key={a}>{a}</Badge>)}</div><strong>{r.title}</strong><p className="small muted" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.summary}</p></div></Card>)}</div>{items.length === 0 && <Empty icon={<I.book size={28} />} title="No resources match" />}</Page>;
}
export function ResourcePage({ id }: { id: string }) {
  const content = useContent(); const r = content.resources.find((x) => x.id === id);
  if (!r) return <Page><PageHead title="Resource not found" crumbs={[{ label: "Resources", to: "resources" }]} /><Notice kind="warn">This article does not exist.</Notice></Page>;
  return <Page narrow><PageHead crumbs={[{ label: "Resources", to: "resources" }, { label: CATS.find((c) => c.id === r.category)?.label ?? r.category, to: "resources", id: r.category }]} eyebrow={r.audience.join(" · ")} title={r.title} lede={r.summary} />
    {r.disclaimer && <Notice kind="warn">{r.disclaimer}</Notice>}
    <div className="prose col gap-3">{r.body.map((p, i) => <p key={i}>{p}</p>)}</div>
    {r.checklist.length > 0 && <Card title="Checklist"><ul className="col gap-2" style={{ paddingLeft: "1.1rem" }}>{r.checklist.map((c, i) => <li key={i}>{c}</li>)}</ul></Card>}
    {r.officialLinks.length > 0 && <Card title="Official sources"><div className="col gap-2">{r.officialLinks.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2"><I.external size={16} />{l.label}<span className="xsmall muted">{l.url}</span></a>)}</div></Card>}
  </Page>;
}
export function GlossaryPage() {
  const content = useContent(); const ss = useSession(); const t = ss.tenant!; const [q, setQ] = useState("");
  const terms = content.glossary.filter((g) => !q || `${g.term} ${g.definition}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.term.localeCompare(b.term)); const letters = [...new Set(terms.map((x) => x.term[0].toUpperCase()))];
  return <Page narrow><PageHead crumbs={[{ label: "Resources", to: "resources" }]} eyebrow="Baseball terminology" title="Glossary for new baseball families" lede="Every word you will hear at the field, in plain language, with an example." /><SearchInput value={q} onChange={setQ} placeholder="Search terms" />
    <div className="flex gap-1 wrap small">{letters.map((l) => <a key={l} href={`#glossary`} onClick={(e) => { e.preventDefault(); document.getElementById(`gl-${l}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="chip">{l}</a>)}</div>
    {letters.map((l) => <Section key={l} title={l}><div id={`gl-${l}`} className="list">{terms.filter((x) => x.term[0].toUpperCase() === l).map((g) => <div key={g.id} className="list-item" style={{ alignItems: "flex-start" }}><div className="col gap-1 grow"><strong>{g.term}</strong><span className="small">{g.definition}</span><span className="small muted"><em>{g.example}</em></span>{g.relatedLessonIds.length > 0 && <span className="flex gap-2 wrap xsmall">{g.relatedLessonIds.map((lid) => t.lessonById.get(lid)).filter(Boolean).map((ls) => <Link key={ls!.id} to="lesson" id={ls!.id}>{ls!.title}</Link>)}</span>}</div></div>)}</div></Section>)}
    {terms.length === 0 && <Empty icon={<I.book size={28} />} title="No terms match" />}</Page>;
}
