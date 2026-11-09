/* Drill diagrammer: place players, coaches, cones, balls and equipment on a field, draw throw/run/move arrows,
   drag to adjust. The result is a small JSON spec stored with the drill and drawn read-only wherever the drill appears. */
import { useRef, useState } from "react";
import { Button, Field, Input, Modal, Notice } from "./ui";
import { I } from "./icons";
import type { DiagramArrow, DiagramItem, DiagramItemKind, DrillDiagram } from "../core/types";
import { newId } from "../core/util";

const KINDS: { kind: DiagramItemKind; label: string; short: string }[] = [{ kind: "player", label: "Player", short: "P" }, { kind: "coach", label: "Coach", short: "C" }, { kind: "cone", label: "Cone", short: "▲" }, { kind: "ball", label: "Ball", short: "●" }, { kind: "bucket", label: "Bucket of balls", short: "B" }, { kind: "tee", label: "Tee", short: "T" }, { kind: "net", label: "Net / screen", short: "N" }, { kind: "glove", label: "Target glove", short: "G" }];
const ARROWS: { kind: DiagramArrow["kind"]; label: string; color: string }[] = [{ kind: "throw", label: "Throw", color: "var(--sky)" }, { kind: "run", label: "Run", color: "var(--clay)" }, { kind: "move", label: "Move / roll", color: "var(--fg-muted)" }];
export const EMPTY_DIAGRAM: DrillDiagram = { items: [], arrows: [] };

/** Read-only drawing, 400x400 field with the infield in the lower middle. */
export function DrillDiagramView({ diagram, size = "100%", caption, onPoint, children }: { diagram: DrillDiagram; size?: string | number; caption?: string; onPoint?: (x: number, y: number, e: React.PointerEvent<SVGSVGElement>) => void; children?: React.ReactNode }) {
  const ref = useRef<SVGSVGElement | null>(null);
  const toField = (e: React.PointerEvent<SVGSVGElement>) => { const r = ref.current!.getBoundingClientRect(); return { x: Math.round(((e.clientX - r.left) / r.width) * 400), y: Math.round(((e.clientY - r.top) / r.height) * 400) }; };
  return <figure style={{ margin: 0, width: size, maxWidth: "100%" }} className="diagram-wrap"><svg ref={ref} viewBox="0 0 400 400" width="100%" style={{ display: "block", aspectRatio: "1 / 1", touchAction: "none" }} role="img" aria-label={caption ?? "Drill diagram"} onPointerDown={onPoint ? (e) => { const p = toField(e); onPoint(p.x, p.y, e); } : undefined}>
    <defs>{ARROWS.map((a) => <marker key={a.kind} id={`dg-${a.kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill={a.color} /></marker>)}</defs>
    <rect x="0" y="0" width="400" height="400" fill="var(--grass-soft)" /><path d="M200 372 L58 230 A 200 200 0 0 1 342 230 Z" fill="var(--clay-soft)" stroke="var(--border)" /><path d="M200 340 L290 250 L200 160 L110 250 Z" fill="var(--grass-soft)" stroke="var(--clay)" strokeWidth="2" /><path d="M200 340 L20 160 M200 340 L380 160" stroke="var(--surface)" strokeWidth="2" strokeDasharray="4 4" /><circle cx="200" cy="262" r="14" fill="var(--clay-soft)" stroke="var(--clay)" /><circle cx="200" cy="340" r="24" fill="var(--clay-soft)" stroke="var(--clay)" />{[[200, 340], [290, 250], [200, 160], [110, 250]].map(([x, y], i) => <rect key={i} x={x - 6} y={y - 6} width="12" height="12" transform={`rotate(45 ${x} ${y})`} fill="var(--surface)" stroke="var(--border-strong)" />)}
    {diagram.arrows.map((a) => { const c = ARROWS.find((x) => x.kind === a.kind)!; const dx = a.to.x - a.from.x, dy = a.to.y - a.from.y, len = Math.hypot(dx, dy) || 1; const ox = (dx / len) * 10, oy = (dy / len) * 10; return <path key={a.id} d={`M${a.from.x + ox} ${a.from.y + oy} L${a.to.x - ox} ${a.to.y - oy}`} stroke={c.color} strokeWidth="2.5" fill="none" strokeDasharray={a.kind === "run" ? "6 4" : a.kind === "move" ? "2 4" : undefined} markerEnd={`url(#dg-${a.kind})`} />; })}
    {diagram.items.map((it) => <DiagramGlyph key={it.id} item={it} />)}
    {children}
  </svg>{(caption || diagram.note) && <figcaption className="small muted mt-2">{caption ?? diagram.note}</figcaption>}</figure>;
}
function DiagramGlyph({ item, selected }: { item: DiagramItem; selected?: boolean }) {
  const { x, y } = item; const stroke = selected ? "var(--primary)" : "var(--fg)"; const label = item.label; const w = selected ? 2.5 : 1.5;
  const glyph = item.kind === "player" ? <><circle cx={x} cy={y} r="11" fill="var(--surface)" stroke={stroke} strokeWidth={w} /><text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--fg)" fontFamily="var(--font-display)">{label ?? "P"}</text></>
    : item.kind === "coach" ? <><rect x={x - 10} y={y - 10} width="20" height="20" rx="3" fill="var(--chrome)" stroke={stroke} strokeWidth={w} /><text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="var(--font-display)">{label ?? "C"}</text></>
    : item.kind === "cone" ? <><path d={`M${x} ${y - 10} L${x + 9} ${y + 8} L${x - 9} ${y + 8} Z`} fill="var(--gold)" stroke={stroke} strokeWidth={w} />{label && <text x={x} y={y + 20} textAnchor="middle" fontSize="8" fill="var(--fg-muted)">{label}</text>}</>
    : item.kind === "ball" ? <><circle cx={x} cy={y} r="6" fill="#fff" stroke="var(--stitch)" strokeWidth={w} /><path d={`M${x - 3} ${y - 4} q 3 4 0 8 M${x + 3} ${y - 4} q -3 4 0 8`} stroke="var(--stitch)" fill="none" strokeWidth="1" /></>
    : item.kind === "bucket" ? <><rect x={x - 8} y={y - 8} width="16" height="16" rx="2" fill="var(--sky)" stroke={stroke} strokeWidth={w} /><circle cx={x - 3} cy={y - 3} r="2" fill="#fff" /><circle cx={x + 3} cy={y - 3} r="2" fill="#fff" /><circle cx={x} cy={y + 3} r="2" fill="#fff" /></>
    : item.kind === "tee" ? <><line x1={x} y1={y + 10} x2={x} y2={y - 6} stroke={stroke} strokeWidth="3" /><circle cx={x} cy={y - 8} r="4" fill="#fff" stroke="var(--stitch)" /><line x1={x - 7} y1={y + 10} x2={x + 7} y2={y + 10} stroke={stroke} strokeWidth="3" /></>
    : item.kind === "net" ? <><rect x={x - 14} y={y - 10} width="28" height="20" fill="none" stroke={stroke} strokeWidth={w} /><path d={`M${x - 14} ${y - 3} h28 M${x - 14} ${y + 4} h28 M${x - 7} ${y - 10} v20 M${x} ${y - 10} v20 M${x + 7} ${y - 10} v20`} stroke={stroke} strokeWidth=".8" /></>
    : <><path d={`M${x - 8} ${y - 2} q 0 -9 8 -9 q 8 0 8 9 v 8 q 0 4 -4 4 h -8 q -4 0 -4 -4 Z`} fill="var(--clay)" stroke={stroke} strokeWidth={w} /></>;
  return <g>{glyph}{label && item.kind !== "player" && item.kind !== "coach" && item.kind !== "cone" && <text x={x} y={y + 22} textAnchor="middle" fontSize="8" fill="var(--fg-muted)">{label}</text>}</g>;
}
/** Editor modal. Click to place the selected piece; drag a piece to move it; in arrow mode click start then end. */
export function DiagramEditor({ initial, title, onSave, onClose }: { initial: DrillDiagram | undefined; title: string; onSave: (d: DrillDiagram | null) => Promise<unknown>; onClose: () => void }) {
  const [d, setD] = useState<DrillDiagram>(initial ? { items: initial.items.map((x) => ({ ...x })), arrows: initial.arrows.map((x) => ({ ...x })), note: initial.note } : EMPTY_DIAGRAM); const [tool, setTool] = useState<DiagramItemKind | DiagramArrow["kind"] | "select">("player"); const [sel, setSel] = useState<string | null>(null); const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null); const [label, setLabel] = useState(""); const [busy, setBusy] = useState(false); const dragging = useRef<string | null>(null);
  const isArrow = ARROWS.some((a) => a.kind === tool); const selected = d.items.find((i) => i.id === sel) ?? d.arrows.find((a) => a.id === sel);
  const onPoint = (x: number, y: number, e: React.PointerEvent<SVGSVGElement>) => {
    const hit = [...d.items].reverse().find((i) => Math.hypot(i.x - x, i.y - y) <= 14);
    if (tool === "select" || (hit && !isArrow)) { setSel(hit?.id ?? null); dragging.current = hit?.id ?? null; (e.target as Element).setPointerCapture?.(e.pointerId); return; }
    if (isArrow) { if (!arrowStart) { setArrowStart({ x, y }); return; } const a: DiagramArrow = { id: newId("ar"), from: arrowStart, to: { x, y }, kind: tool as DiagramArrow["kind"] }; setD({ ...d, arrows: [...d.arrows, a] }); setArrowStart(null); setSel(a.id); return; }
    const it: DiagramItem = { id: newId("it"), kind: tool as DiagramItemKind, x, y, label: label.trim() || undefined }; setD({ ...d, items: [...d.items, it] }); setSel(it.id);
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => { if (!dragging.current) return; const svg = e.currentTarget; const r = svg.getBoundingClientRect(); const x = Math.max(0, Math.min(400, Math.round(((e.clientX - r.left) / r.width) * 400))), y = Math.max(0, Math.min(400, Math.round(((e.clientY - r.top) / r.height) * 400))); setD({ ...d, items: d.items.map((i) => (i.id === dragging.current ? { ...i, x, y } : i)) }); };
  const stop = () => { dragging.current = null; };
  const remove = () => { if (!sel) return; setD({ ...d, items: d.items.filter((i) => i.id !== sel), arrows: d.arrows.filter((a) => a.id !== sel) }); setSel(null); };
  return <Modal title={`Diagram · ${title}`} onClose={onClose} large footer={<><Button variant="ghost" onClick={async () => { setBusy(true); await onSave(null); setBusy(false); onClose(); }}>Remove diagram</Button><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={busy || d.items.length + d.arrows.length === 0} onClick={async () => { setBusy(true); const ok = await onSave(d); setBusy(false); if (ok !== undefined) onClose(); }}>{busy ? "Saving…" : "Save diagram"}</Button></>}>
    <div className="diagram-editor">
      <div className="col gap-3">
        <div className="col gap-1"><span className="label">Place</span><div className="chips">{KINDS.map((k) => <button key={k.kind} type="button" className={`chip ${tool === k.kind ? "on" : ""}`} aria-pressed={tool === k.kind} onClick={() => { setTool(k.kind); setArrowStart(null); }}>{k.label}</button>)}</div></div>
        <div className="col gap-1"><span className="label">Draw</span><div className="chips">{ARROWS.map((a) => <button key={a.kind} type="button" className={`chip ${tool === a.kind ? "on" : ""}`} aria-pressed={tool === a.kind} onClick={() => { setTool(a.kind); setArrowStart(null); }}>{a.label} arrow</button>)}<button type="button" className={`chip ${tool === "select" ? "on" : ""}`} aria-pressed={tool === "select"} onClick={() => { setTool("select"); setArrowStart(null); }}>Select / move</button></div></div>
        <Field label="Label for the next piece" hint="Position (SS), a name, or a number. Optional.">{(id) => <Input id={id} value={label} maxLength={6} onChange={(e) => setLabel(e.target.value)} />}</Field>
        <Field label="Caption">{(id) => <Input id={id} value={d.note ?? ""} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="One line that explains the picture" />}</Field>
        <div className="flex gap-2 wrap"><Button size="sm" disabled={!selected} icon={<I.trash size={14} />} onClick={remove}>Remove selected</Button><Button size="sm" variant="ghost" onClick={() => { setD({ ...d, items: [], arrows: [] }); setSel(null); }}>Clear</Button></div>
        <Notice kind="info">{isArrow ? (arrowStart ? "Now click where the arrow ends." : "Click where the arrow starts.") : tool === "select" ? "Click a piece to select it, drag to move." : `Click the field to place a ${KINDS.find((k) => k.kind === tool)?.label.toLowerCase()}.`} {d.items.length} pieces, {d.arrows.length} arrows.</Notice>
      </div>
      <div className="diagram-canvas" onPointerMove={onMove as any} onPointerUp={stop} onPointerLeave={stop}><DrillDiagramView diagram={d} onPoint={onPoint}>{arrowStart && <circle cx={arrowStart.x} cy={arrowStart.y} r="5" fill="var(--primary)" />}{sel && d.items.filter((i) => i.id === sel).map((i) => <circle key={i.id} cx={i.x} cy={i.y} r="17" fill="none" stroke="var(--primary)" strokeDasharray="3 3" />)}{sel && d.arrows.filter((a) => a.id === sel).map((a) => <circle key={a.id} cx={(a.from.x + a.to.x) / 2} cy={(a.from.y + a.to.y) / 2} r="8" fill="none" stroke="var(--primary)" strokeDasharray="3 3" />)}</DrillDiagramView></div>
    </div></Modal>;
}
