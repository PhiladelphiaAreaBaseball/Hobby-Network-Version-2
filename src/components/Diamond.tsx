/* Interactive baseball diamond. Coordinates are in a 400x400 viewBox with home plate near the bottom center. */
import type { DiagramSpec, FieldSpot } from "../core/types";
import { cx } from "../core/util";
export const SPOTS: Record<FieldSpot, { x: number; y: number; label: string; kind: "position" | "base" | "area" }> = {
  home: { x: 200, y: 340, label: "Home", kind: "base" }, first: { x: 290, y: 250, label: "1st", kind: "base" }, second: { x: 200, y: 160, label: "2nd", kind: "base" }, third: { x: 110, y: 250, label: "3rd", kind: "base" }, mound: { x: 200, y: 262, label: "Mound", kind: "area" },
  P: { x: 200, y: 262, label: "P", kind: "position" }, C: { x: 200, y: 368, label: "C", kind: "position" }, "1B": { x: 300, y: 222, label: "1B", kind: "position" }, "2B": { x: 248, y: 170, label: "2B", kind: "position" }, SS: { x: 152, y: 170, label: "SS", kind: "position" }, "3B": { x: 100, y: 222, label: "3B", kind: "position" },
  LF: { x: 90, y: 95, label: "LF", kind: "position" }, CF: { x: 200, y: 55, label: "CF", kind: "position" }, RF: { x: 310, y: 95, label: "RF", kind: "position" },
  LCgap: { x: 140, y: 70, label: "LC gap", kind: "area" }, RCgap: { x: 260, y: 70, label: "RC gap", kind: "area" }, shallowLF: { x: 110, y: 150, label: "Shallow LF", kind: "area" }, shallowRF: { x: 290, y: 150, label: "Shallow RF", kind: "area" }, deepCF: { x: 200, y: 22, label: "Deep CF", kind: "area" },
  cutoff1B: { x: 262, y: 230, label: "Cutoff (1B side)", kind: "area" }, cutoff3B: { x: 138, y: 230, label: "Cutoff (3B side)", kind: "area" }, bunt3B: { x: 165, y: 300, label: "Bunt 3B line", kind: "area" }, bunt1B: { x: 235, y: 300, label: "Bunt 1B line", kind: "area" },
};
export interface DiamondProps { highlight?: FieldSpot[]; runners?: ("first" | "second" | "third")[]; arrows?: { from: FieldSpot; to: FieldSpot; kind: "throw" | "run" | "move" }[]; youAre?: FieldSpot | null; ballTo?: FieldSpot | null; selectable?: FieldSpot[] | "all" | null; onSelect?: (s: FieldSpot) => void; selected?: FieldSpot | null; verdicts?: Partial<Record<FieldSpot, "correct" | "acceptable" | "wrong">>; showLabels?: boolean; size?: number | string; animate?: boolean; caption?: string; }
export function Diamond({ highlight = [], runners = [], arrows = [], youAre, ballTo, selectable = null, onSelect, selected, verdicts = {}, showLabels = true, size = "100%", animate, caption }: DiamondProps) {
  const sel = selectable === "all" ? (Object.keys(SPOTS) as FieldSpot[]).filter((k) => SPOTS[k].kind !== "area" || k === "mound") : (selectable ?? []);
  const isSel = (s: FieldSpot) => sel.includes(s);
  const positions = (Object.keys(SPOTS) as FieldSpot[]).filter((k) => SPOTS[k].kind === "position");
  const bases: FieldSpot[] = ["first", "second", "third", "home"];
  const areas = (Object.keys(SPOTS) as FieldSpot[]).filter((k) => SPOTS[k].kind === "area" && (highlight.includes(k) || isSel(k) || ballTo === k || verdicts[k] || arrows.some((a) => a.from === k || a.to === k)));
  const fillFor = (s: FieldSpot) => verdicts[s] === "correct" ? "var(--grass)" : verdicts[s] === "acceptable" ? "var(--gold)" : verdicts[s] === "wrong" ? "var(--stitch)" : selected === s ? "var(--primary)" : highlight.includes(s) ? "var(--clay)" : youAre === s ? "var(--sky)" : "var(--surface)";
  const strokeFor = (s: FieldSpot) => (selected === s || highlight.includes(s) || youAre === s || verdicts[s]) ? "var(--fg)" : "var(--border-strong)";
  const textFor = (s: FieldSpot) => (verdicts[s] || selected === s || highlight.includes(s) || youAre === s) ? "#fff" : "var(--fg)";
  return <figure style={{ margin: 0, width: size, maxWidth: "100%" }} className="diamond-wrap">
    <svg viewBox="0 0 400 400" width="100%" style={{ display: "block", maxWidth: "100%", aspectRatio: "1 / 1" }} role="img" aria-label={caption ?? "Baseball diamond"}>
      <defs><marker id="arrow-throw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="var(--sky)" /></marker><marker id="arrow-run" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="var(--clay)" /></marker><marker id="arrow-move" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="var(--fg-muted)" /></marker></defs>
      <path d="M200 372 L12 184 A 265 265 0 0 1 388 184 Z" fill="var(--grass-soft)" stroke="var(--border)" />
      <path d="M200 372 L58 230 A 200 200 0 0 1 342 230 Z" fill="var(--clay-soft)" stroke="var(--border)" />
      <path d="M200 340 L290 250 L200 160 L110 250 Z" fill="var(--grass-soft)" stroke="var(--clay)" strokeWidth="2" />
      <path d="M200 340 L60 200 M200 340 L340 200" stroke="var(--surface)" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="200" cy="262" r="16" fill="var(--clay-soft)" stroke="var(--clay)" />
      <circle cx="200" cy="340" r="26" fill="var(--clay-soft)" stroke="var(--clay)" />
      {bases.map((b) => { const s = SPOTS[b]; const r = runners.includes(b as any); const click = isSel(b); return <g key={b} onClick={click && onSelect ? () => onSelect(b) : undefined} style={{ cursor: click ? "pointer" : "default" }} role={click ? "button" : undefined} tabIndex={click ? 0 : undefined} aria-label={click ? `Throw to ${s.label}` : s.label} onKeyDown={click && onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(b); } } : undefined}>
        <rect x={s.x - 9} y={s.y - 9} width="18" height="18" transform={`rotate(45 ${s.x} ${s.y})`} fill={fillFor(b)} stroke={strokeFor(b)} strokeWidth={click ? 2.5 : 1.5} />
        {click && <circle cx={s.x} cy={s.y} r="22" fill="none" stroke="var(--primary)" strokeOpacity=".45" strokeDasharray="3 3" />}
        {r && <g><circle cx={s.x} cy={s.y - 22} r="8" fill="var(--clay)" stroke="#fff" strokeWidth="1.5" /><text x={s.x} y={s.y - 19} textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" fontFamily="var(--font-display)">R</text></g>}
        {showLabels && <text x={s.x} y={s.y + 26} textAnchor="middle" fontSize="10" fill="var(--fg-muted)" fontFamily="var(--font-body)">{s.label}</text>}</g>; })}
      {areas.map((a) => { const s = SPOTS[a]; const click = isSel(a); return <g key={a} onClick={click && onSelect ? () => onSelect(a) : undefined} style={{ cursor: click ? "pointer" : "default" }} role={click ? "button" : undefined} tabIndex={click ? 0 : undefined} aria-label={s.label} onKeyDown={click && onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(a); } } : undefined}>
        <circle cx={s.x} cy={s.y} r="13" fill={fillFor(a)} stroke={strokeFor(a)} strokeDasharray={a === ballTo ? undefined : "3 2"} strokeWidth={click ? 2.5 : 1.5} opacity={a === "mound" ? 0 : 1} />
        {showLabels && a !== "mound" && <text x={s.x} y={s.y + 24} textAnchor="middle" fontSize="9" fill="var(--fg-muted)">{s.label}</text>}</g>; })}
      {positions.map((p) => { const s = SPOTS[p]; const click = isSel(p); return <g key={p} onClick={click && onSelect ? () => onSelect(p) : undefined} style={{ cursor: click ? "pointer" : "default" }} role={click ? "button" : undefined} tabIndex={click ? 0 : undefined} aria-label={click ? `Select ${s.label}` : s.label} onKeyDown={click && onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(p); } } : undefined}>
        <circle cx={s.x} cy={s.y} r={youAre === p ? 15 : 13} fill={fillFor(p)} stroke={strokeFor(p)} strokeWidth={click || youAre === p ? 2.5 : 1.5} />
        {click && <circle cx={s.x} cy={s.y} r="20" fill="none" stroke="var(--primary)" strokeOpacity=".45" strokeDasharray="3 3" />}
        <text x={s.x} y={s.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={textFor(p)} fontFamily="var(--font-display)">{s.label}</text>
        {youAre === p && <text x={s.x} y={s.y - 20} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--sky)">YOU</text>}</g>; })}
      {ballTo && SPOTS[ballTo] && <g><circle cx={SPOTS[ballTo].x + 14} cy={SPOTS[ballTo].y - 14} r="7" fill="#fff" stroke="var(--stitch)" strokeWidth="1.5" /><path d={`M${SPOTS[ballTo].x + 10} ${SPOTS[ballTo].y - 18} q 3 4 0 8 M${SPOTS[ballTo].x + 18} ${SPOTS[ballTo].y - 18} q -3 4 0 8`} stroke="var(--stitch)" fill="none" strokeWidth="1" /></g>}
      {arrows.map((a, i) => { const f = SPOTS[a.from], t = SPOTS[a.to]; if (!f || !t) return null; const dx = t.x - f.x, dy = t.y - f.y, len = Math.hypot(dx, dy) || 1; const ox = (dx / len) * 16, oy = (dy / len) * 16; const color = a.kind === "throw" ? "var(--sky)" : a.kind === "run" ? "var(--clay)" : "var(--fg-muted)"; const d = `M${f.x + ox} ${f.y + oy} L${t.x - ox} ${t.y - oy}`; return <path key={i} d={d} stroke={color} strokeWidth="3" fill="none" markerEnd={`url(#arrow-${a.kind})`} strokeDasharray={a.kind === "run" ? "6 4" : undefined} className={cx(animate && "diamond-arrow")} style={animate ? { animationDelay: `${i * 0.5}s` } : undefined} />; })}
    </svg>{caption && <figcaption className="small muted mt-2">{caption}</figcaption>}</figure>;
}
export function DiagramView({ spec, size }: { spec: DiagramSpec; size?: number | string }) { return <Diamond highlight={spec.highlight} runners={spec.runners} arrows={spec.arrows} caption={spec.caption} size={size} />; }
