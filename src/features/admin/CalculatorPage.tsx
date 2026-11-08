import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, Button, Card, Check, CopyBox, Field, Input, Modal, Notice, Page, PageHead, Section } from "../../components/ui";
import { I } from "../../components/icons";
import { useTenant } from "../../core/select";
import { store, useAppStore, currentMemberships } from "../../core/store";
import { can } from "../../core/rbac";
import { navigate } from "../../core/router";
import { capability } from "../../core/capabilities";
import { actions, run } from "../../core/actions";
import { clampInputs, computeTurf, decodeScenario, DEFAULT_INPUTS, describeTimeline, encodeScenario, fmtUSD, LIMITS, PRESETS, type TurfInputs, type TurfResult } from "../../engines/turfCalculator";
import { buildScenarioPdf } from "./calculatorPdf";
import { fmtDateTime } from "../../core/dates";
import { cx } from "../../core/util";

const COLORS = { league: "var(--grass)", turf: "var(--primary)", platform: "var(--gold)", total: "var(--chrome)" };
const compact = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
const SUGGESTED_NAMES = ["Conservative Enrollment", "Current Enrollment", "Growth Scenario", "Turf Project 2028"];

export function CalculatorPage({ code }: { code?: string }) {
  const t = useTenant(); const s = useAppStore(); const memberships = currentMemberships(s);
  const allowed = t ? can(memberships, "league.finance.view", { leagueId: t.leagueId }) || can(memberships, "league.finance", { leagueId: t.leagueId }) || can(memberships, "league.manage", { leagueId: t.leagueId }) : false;
  const [inputs, setInputs] = useState<TurfInputs>(() => (code && decodeScenario(code)) || DEFAULT_INPUTS);
  const [presetId, setPresetId] = useState<string>(() => PRESETS.find((p) => p.cost === ((code && decodeScenario(code)) || DEFAULT_INPUTS).cost)?.id ?? "custom");
  const [loadedScenarioId, setLoadedScenarioId] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "share" | "save" | "open" | "pdf">(null); const [shareCode, setShareCode] = useState("");
  useEffect(() => { const d = code ? decodeScenario(code) : null; if (d) { setInputs(d); setPresetId(PRESETS.find((p) => p.cost === d.cost)?.id ?? "custom"); } }, [code]);
  const result = useMemo(() => computeTurf(inputs), [inputs]);
  const update = (patch: Partial<TurfInputs>, changed?: keyof TurfInputs) => setInputs((prev) => clampInputs({ ...prev, ...patch }, changed));
  if (!t) return null;
  if (!allowed) return <Page><PageHead eyebrow="Financial planning" title="Field Improvement Fund Calculator" /><Notice kind="warn">This planning tool is available to league administrators and board members with finance permissions. Ask your league president for access.</Notice></Page>;
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[4]; const timeline = describeTimeline(result); const scenarioCode = encodeScenario(inputs);
  const loaded = loadedScenarioId ? t.scenarios.find((x) => x.id === loadedScenarioId) : undefined; const dirty = loaded ? encodeScenario(loaded.inputs) !== scenarioCode : false;
  const reset = () => { setInputs(DEFAULT_INPUTS); setPresetId("infield_5070"); setLoadedScenarioId(null); store.toast("Reset to the default example.", "info"); };
  const downloadPdf = async () => {
    const bytes = buildScenarioPdf({ leagueName: t.league.name, inputs, result, presetLabel: preset.label, scenarioName: loaded?.name, preparedBy: t.userName(s.session?.userId) });
    const filename = `gameplaniq-field-fund-${scenarioCode}.pdf`; const dl = capability().downloads;
    if (dl) { try { await dl.save({ filename, data: bytes }); store.toast("PDF saved.", "success"); return; } catch (e: any) { if (e?.code === "declined") return; console.warn(e); } }
    try { const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); store.toast("PDF download started.", "success"); } catch { setModal("pdf"); }
  };
  const share = () => { setShareCode(scenarioCode); navigate("admin", `calculator-${scenarioCode}`); setModal("share"); };
  const openPrint = () => navigate("admin", `calculator-print-${scenarioCode}`);
  return <Page>
    <PageHead eyebrow="League management · Financial planning" title="Field Improvement Fund Calculator" lede="See how your league can turn annual player registration into long-term facility improvements." actions={<><Button icon={<I.refresh size={16} />} onClick={reset}>Reset to defaults</Button><Button icon={<I.download size={16} />} onClick={downloadPdf}>Download PDF</Button><Button icon={<I.list size={16} />} onClick={openPrint}>Print summary</Button><Button icon={<I.external size={16} />} onClick={share}>Share scenario</Button><Button variant="primary" icon={<I.star size={16} />} onClick={() => setModal("save")}>{loaded ? (dirty ? "Save changes" : "Save as new") : "Save scenario"}</Button></>} />
    {loaded && <Notice kind="info">Viewing saved scenario <strong>{loaded.name}</strong>{dirty ? " (edited, not yet saved)" : ""}. <button className="link-btn" onClick={() => setLoadedScenarioId(null)}>Detach</button></Notice>}
    <div className="calc-grid">
      <div className="calc-inputs">
        <Card title="Adjust the scenario" action={<Badge tone="sky">Live</Badge>}>
          <div className="col gap-4">
            <SliderField id="players" label="Registered players" value={inputs.players} min={LIMITS.players.min} max={LIMITS.players.max} step={LIMITS.players.step} onChange={(v) => update({ players: v }, "players")} format={(v) => v.toLocaleString("en-US")} hint="Registered once per year" />
            <SliderField id="fee" label="Annual registration fee per player" value={inputs.fee} min={LIMITS.fee.min} max={LIMITS.fee.max} step={LIMITS.fee.step} onChange={(v) => update({ fee: v }, "fee")} format={fmtUSD} prefix="$" />
            <SliderField id="league" label="Returned to the league per player" value={inputs.league} min={0} max={inputs.fee} step={25} onChange={(v) => update({ league: v }, "league")} format={fmtUSD} prefix="$" color={COLORS.league} hint={`Up to the ${fmtUSD(inputs.fee)} fee`} />
            <SliderField id="turf" label="Turf fund contribution per player" value={inputs.turf} min={0} max={inputs.fee - inputs.league} step={25} onChange={(v) => update({ turf: v }, "turf")} format={fmtUSD} prefix="$" color={COLORS.turf} hint={`Up to the remaining ${fmtUSD(inputs.fee - inputs.league)}`} />
            <div className="panel" style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", alignItems: "center" }}><span className="small">Platform / operator share per player <span className="muted">(remainder)</span></span><strong className="tnum" style={{ color: COLORS.platform, fontSize: "1.1rem" }}>{fmtUSD(result.platformPerPlayer)}</strong></div>
            <div className="col gap-2"><div className="label">Project type</div><div className="preset-grid" role="radiogroup" aria-label="Project cost presets">{PRESETS.map((p) => <button key={p.id} type="button" className="option" role="radio" aria-checked={presetId === p.id} aria-pressed={presetId === p.id} onClick={() => { setPresetId(p.id); if (p.cost !== null) update({ cost: p.cost }, "cost"); }}><strong>{p.label}</strong><span>{p.cost === null ? "Your estimate" : fmtUSD(p.cost)}</span></button>)}</div><div className="hint">{preset.note} Presets are illustrative planning assumptions, not contractor quotes.</div></div>
            <SliderField id="cost" label="Estimated turf installation cost" value={inputs.cost} min={LIMITS.cost.min} max={LIMITS.cost.max} step={LIMITS.cost.step} onChange={(v) => { update({ cost: v }, "cost"); if (PRESETS.find((p) => p.id === presetId)?.cost !== v) setPresetId("custom"); }} format={fmtUSD} prefix="$" color="var(--clay)" />
          </div>
        </Card>
        <SavedScenarios scenarios={t.scenarios} userName={t.userName} loadedId={loadedScenarioId} onLoad={(sc) => { setInputs(clampInputs(sc.inputs)); setPresetId(sc.presetId ?? PRESETS.find((p) => p.cost === sc.inputs.cost)?.id ?? "custom"); setLoadedScenarioId(sc.id); store.toast(`Loaded “${sc.name}”.`, "info"); }} />
      </div>
      <div className="col gap-6">
        <Section title="Annual financial summary">
          <div className="fin-cards" aria-live="polite">
            <FinCard label="Total annual registration revenue" value={result.totalRevenue} color={COLORS.total} formula={`${inputs.players.toLocaleString()} players × ${fmtUSD(inputs.fee)}`} />
            <FinCard label="Annual revenue returned to league" value={result.leagueRevenue} color={COLORS.league} formula={`${inputs.players.toLocaleString()} × ${fmtUSD(inputs.league)}`} />
            <FinCard label="Annual turf fund savings" value={result.turfSavings} color={COLORS.turf} formula={`${inputs.players.toLocaleString()} × ${fmtUSD(inputs.turf)}`} />
            <FinCard label="Annual platform / operator revenue" value={result.platformRevenue} color={COLORS.platform} formula={`${inputs.players.toLocaleString()} × ${fmtUSD(result.platformPerPlayer)}`} />
          </div>
        </Section>
        <Section title="Revenue distribution"><Card><DistributionBar r={result} /></Card></Section>
        <Section title="Turf funding timeline">
          <div className="timeline-hero"><div><div className="eyebrow" style={{ color: "var(--chrome-muted)" }}>Estimated time until turf installation is fully funded</div><div className="tl-big" data-testid="timeline-years">{timeline.headline}</div><div className="tl-sub mt-2">{timeline.detail}</div></div><div className="col gap-1 right" style={{ minWidth: 150 }}><span className="tl-sub small">Project cost</span><strong style={{ fontSize: "1.4rem", fontFamily: "var(--font-display)" }} className="tnum">{fmtUSD(inputs.cost)}</strong><span className="tl-sub small">Annual turf savings</span><strong style={{ fontSize: "1.4rem", fontFamily: "var(--font-display)", color: "#8FB3FF" }} className="tnum">{fmtUSD(result.turfSavings)}</strong></div></div>
          <Card><div className="col gap-2"><div className="flex justify-between wrap gap-2"><strong>Funding progress after one year</strong><span className="tnum">{fmtUSD(result.turfSavings)} of {fmtUSD(inputs.cost)} · {result.firstYearPct}%</span></div><div className="progress progress-grass" style={{ height: ".9rem" }} role="progressbar" aria-valuenow={result.firstYearPctCapped} aria-valuemin={0} aria-valuemax={100} aria-label="Turf project funded after one year"><span style={{ width: `${result.firstYearPctCapped}%`, background: COLORS.turf }} /></div><div className="hint">Annual turf savings ÷ project cost. Displayed progress is capped at 100%.</div></div></Card>
        </Section>
        <Section title="Multi-year savings" lede="Accumulated turf fund over ten annual registration cycles."><Card><SavingsChart r={result} cost={inputs.cost} /></Card></Section>
        <Notice kind="plain" icon={<I.info size={18} />}><strong>How to read these numbers.</strong> Registration is assumed to occur once per year with constant enrollment. Estimates exclude operating expenses, taxes, inflation, financing costs and investment returns. Project cost presets are planning assumptions, not verified contractor quotes or guaranteed construction prices.</Notice>
      </div>
    </div>
    {modal === "share" && <Modal title="Share this scenario" onClose={() => setModal(null)}><div className="col gap-3"><p className="small muted">Anyone with league access can open this link to see the same settings. The scenario is encoded in the address, so nothing private is sent anywhere.</p><CopyBox text={`${location.origin}${location.pathname}#admin-calculator-${shareCode}`} label="Copy link" /><p className="small muted">Opened inside Claude? The address bar now ends in the scenario code too. You can also share the code alone:</p><CopyBox text={shareCode} label="Copy code" /><Field label="Open a shared scenario code">{(id) => <div className="flex gap-2"><Input id={id} placeholder="p400-f300-l150-t100-c150000" onKeyDown={(e) => { if (e.key === "Enter") { const d = decodeScenario((e.target as HTMLInputElement).value); if (d) { navigate("admin", `calculator-${encodeScenario(d)}`); setModal(null); } else store.toast("That code is not valid.", "error"); } }} /></div>}</Field></div></Modal>}
    {modal === "save" && <SaveModal initialName={loaded?.name ?? ""} onClose={() => setModal(null)} onSave={async (name, asNew) => { const saved = await run(() => actions.saveScenario({ id: asNew ? undefined : loaded?.id, name, inputs, presetId }), `Saved “${name}”.`); if (saved) { setLoadedScenarioId(saved.id); setModal(null); } }} allowUpdate={!!loaded} />}
    {modal === "pdf" && <Modal title="Download not available here" onClose={() => setModal(null)}><p>This viewer does not allow file downloads. Open the artifact on claude.ai (signed in) to save the PDF, or use Print summary and your browser's print command.</p></Modal>}
  </Page>;
}
function SliderField({ id, label, value, min, max, step, onChange, format, prefix, color, hint }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; prefix?: string; color?: string; hint?: string }) {
  const [text, setText] = useState(String(value)); const [editing, setEditing] = useState(false); const [note, setNote] = useState<string | null>(null);
  useEffect(() => { if (!editing) setText(String(value)); }, [value, editing]);
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const commit = () => { setEditing(false); const n = Number(text.replace(/[^0-9.]/g, "")); if (!Number.isFinite(n) || text.trim() === "") { setText(String(value)); setNote("Enter a number."); return; } const snapped = Math.min(max, Math.max(min, Math.round(n / step) * step)); setNote(snapped !== n ? `Adjusted to ${format(snapped)} (allowed range ${format(min)}–${format(max)}, steps of ${prefix ?? ""}${step.toLocaleString()}).` : null); onChange(snapped); setText(String(snapped)); };
  return <div className="slider-field"><div className="slider-head"><label className="label" htmlFor={`${id}-range`}>{label}</label><strong className="tnum" style={{ color: color ?? "var(--primary)" }}>{format(value)}</strong></div>
    <div className="slider-row"><input id={`${id}-range`} className="slider" type="range" min={min} max={max} step={step} value={value} style={{ "--pct": `${pct}%`, "--slider-color": color ?? "var(--primary)" } as any} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={format(value)} aria-describedby={hint ? `${id}-hint` : undefined} /><span className="flex items-center gap-1" style={{ minWidth: 0 }}>{prefix && <span className="muted" aria-hidden="true">{prefix}</span>}<input id={`${id}-number`} className="input" type="text" inputMode="numeric" aria-label={`${label} (exact value)`} value={text} onFocus={(e) => { setEditing(true); const el = e.target; requestAnimationFrame(() => el.select()); }} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} /></span></div>
    <div className="slider-minmax"><span>{format(min)}</span>{hint && <span id={`${id}-hint`} className="muted">{hint}</span>}<span>{format(max)}</span></div>{note && <div className="hint" role="status">{note}</div>}</div>;
}
function FinCard({ label, value, color, formula }: { label: string; value: number; color: string; formula: string }) { return <div className="fin-card" style={{ "--fin": color } as any}><span className="fin-label">{label}</span><span className="fin-value" style={{ color }} data-testid={`fin-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{fmtUSD(value)}</span><span className="fin-formula">{formula}</span></div>; }
function DistributionBar({ r }: { r: TurfResult }) {
  const segs = [{ id: "league", label: "League revenue", v: r.leagueRevenue, p: r.pct.league, c: COLORS.league }, { id: "turf", label: "Turf fund", v: r.turfSavings, p: r.pct.turf, c: COLORS.turf }, { id: "platform", label: "Platform / operator", v: r.platformRevenue, p: r.pct.platform, c: COLORS.platform }];
  return <div className="col gap-3"><div className="dist-bar" role="img" aria-label={segs.map((x) => `${x.label} ${fmtUSD(x.v)} (${x.p}%)`).join(", ")}>{segs.map((x) => <div key={x.id} className="dist-seg" style={{ width: `${x.p}%`, background: x.c }} title={`${x.label}: ${fmtUSD(x.v)} (${x.p}%)`}>{x.p >= 14 ? `${compact(x.v)} · ${x.p}%` : ""}</div>)}</div><div className="dist-legend">{segs.map((x) => <span key={x.id}><i style={{ background: x.c }} /><strong className="tnum">{fmtUSD(x.v)}</strong><span className="muted">{x.label} · {x.p}%</span></span>)}</div></div>;
}
function SavingsChart({ r, cost }: { r: TurfResult; cost: number }) {
  const W = 640, H = 320, L = 66, R = 24, T = 28, B = 44; const [tip, setTip] = useState<number | null>(null); const wrapRef = useRef<HTMLDivElement>(null);
  const yMax = Math.max(cost, r.projection[10].cumulative, 1) * 1.12; const x = (yr: number) => L + (yr / 10) * (W - L - R); const y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const pts = r.projection.map((p) => [x(p.year), y(p.cumulative)] as const); const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" "); const area = `${line} L${x(10).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round((yMax / 1.12) * f)); const funded = r.fundedYear; const tipP = tip !== null ? r.projection[tip] : null;
  return <div className="chart-wrap" ref={wrapRef} onMouseLeave={() => setTip(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Accumulated turf savings over ten years. ${funded ? `Goal of ${fmtUSD(cost)} reached in year ${funded}.` : `Goal of ${fmtUSD(cost)} not reached within ten years.`}`}>
      {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="2 3" /><text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--fg-muted)" fontFamily="var(--font-body)">{compact(v)}</text></g>)}
      {r.projection.map((p) => <text key={p.year} x={x(p.year)} y={H - B + 18} textAnchor="middle" fontSize="11" fill="var(--fg-muted)" fontFamily="var(--font-body)">{p.year}</text>)}
      <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--fg-faint)" fontFamily="var(--font-body)">Years</text>
      <path d={area} fill="var(--primary)" fillOpacity="0.14" /><path d={line} stroke="var(--primary)" strokeWidth="3" fill="none" strokeLinejoin="round" />
      <line x1={L} x2={W - R} y1={y(cost)} y2={y(cost)} stroke="var(--gold)" strokeWidth="2" strokeDasharray="7 5" /><text x={W - R} y={y(cost) - 7} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--gold)" fontFamily="var(--font-body)">Turf goal {fmtUSD(cost)}</text>
      {funded && <g><line x1={x(funded)} x2={x(funded)} y1={y(0)} y2={y(r.projection[funded].cumulative)} stroke="var(--grass)" strokeWidth="2" strokeDasharray="4 3" /><circle cx={x(funded)} cy={y(r.projection[funded].cumulative)} r="9" fill="var(--grass)" stroke="var(--surface)" strokeWidth="3" /><rect x={Math.min(x(funded) - 56, W - R - 112)} y={Math.max(4, y(r.projection[funded].cumulative) - 42)} width="112" height="22" rx="6" fill="var(--grass)" /><text x={Math.min(x(funded) - 56, W - R - 112) + 56} y={Math.max(4, y(r.projection[funded].cumulative) - 42) + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="var(--font-body)">Funded in year {funded}</text></g>}
      {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={tip === i ? 6 : 4} fill={r.projection[i].funded && i > 0 ? "var(--grass)" : "var(--primary)"} stroke="var(--surface)" strokeWidth="2" />)}
      {r.projection.map((p, i) => { const half = (W - L - R) / 20; return <rect key={i} className="chart-col" x={x(p.year) - half} y={T} width={half * 2} height={H - T - B} fill="transparent" tabIndex={0} role="button" aria-label={`Year ${p.year}: ${fmtUSD(p.cumulative)} accumulated${p.funded && p.year > 0 ? ", goal reached" : ""}`} onMouseEnter={() => setTip(i)} onFocus={() => setTip(i)} onBlur={() => setTip(null)} onClick={() => setTip(tip === i ? null : i)} onTouchStart={() => setTip(i)} />; })}
    </svg>
    {tipP && <div className="chart-tip" style={{ left: `${(x(tipP.year) / W) * 100}%`, top: `${(y(tipP.cumulative) / H) * 100}%` }} role="status"><strong>Year {tipP.year}:</strong> {fmtUSD(tipP.cumulative)}{tipP.year > 0 && tipP.funded ? " · goal reached" : ""}{tipP.year === 0 ? " (start)" : ""}</div>}
  </div>;
}
function SavedScenarios({ scenarios, userName, loadedId, onLoad }: { scenarios: any[]; userName: (id: string) => string; loadedId: string | null; onLoad: (sc: any) => void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return <Card title="Saved scenarios" action={<Badge>{scenarios.length}</Badge>}>{scenarios.length === 0 ? <p className="small muted">Save a scenario to compare projections such as “Conservative Enrollment” or “Turf Project 2028”. Saved scenarios are stored with your league and visible to its administrators.</p> : <div>{[...scenarios].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).map((sc) => { const r = computeTurf(sc.inputs); return <div key={sc.id} className="scenario-row"><div className="grow col" style={{ minWidth: 0 }}><strong className={cx(loadedId === sc.id && "")}>{sc.name}{loadedId === sc.id && <Badge tone="grass" className="mt-1" >loaded</Badge>}</strong><span className="small muted">{sc.inputs.players} players · {fmtUSD(sc.inputs.fee)} fee · turf {fmtUSD(sc.inputs.turf)} → {r.yearsToFund === null ? "no funding" : `${r.yearsToFund} yrs`}</span><span className="xsmall faint">{userName(sc.createdByUserId)} · {fmtDateTime(sc.updatedAt)}</span></div><Button size="sm" onClick={() => onLoad(sc)}>Load</Button>{confirm === sc.id ? <><Button size="sm" variant="danger" onClick={() => { run(() => actions.deleteScenario(sc.id), "Scenario deleted."); setConfirm(null); }}>Confirm delete</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Keep</Button></> : <Button size="sm" variant="ghost" aria-label={`Delete ${sc.name}`} onClick={() => setConfirm(sc.id)}><I.trash size={16} /></Button>}</div>; })}</div>}</Card>;
}
function SaveModal({ initialName, onClose, onSave, allowUpdate }: { initialName: string; onClose: () => void; onSave: (name: string, asNew: boolean) => void; allowUpdate: boolean }) {
  const [name, setName] = useState(initialName); const [asNew, setAsNew] = useState(!allowUpdate);
  return <Modal title="Save scenario" onClose={onClose} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={() => onSave(name.trim(), asNew)}>Save</Button></>}><div className="col gap-3"><Field label="Scenario name">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Current Enrollment" maxLength={80} />}</Field><div className="chips">{SUGGESTED_NAMES.map((n) => <button key={n} type="button" className="chip" onClick={() => setName(n)}>{n}</button>)}</div>{allowUpdate && <Check label="Save as a new scenario instead of updating the loaded one" checked={asNew} onChange={setAsNew} />}<p className="small muted">Saved to your league's shared database and visible to other administrators of this league only.</p></div></Modal>;
}
export function CalculatorPrintPage({ code }: { code?: string }) {
  const t = useTenant(); const s = useAppStore(); const inputs = (code && decodeScenario(code)) || DEFAULT_INPUTS; const r = computeTurf(inputs); const preset = PRESETS.find((p) => p.cost === inputs.cost)?.label ?? "Custom facility improvement"; const tl = describeTimeline(r);
  useEffect(() => { const id = setTimeout(() => { try { window.print(); } catch { /* print blocked in this viewer */ } }, 400); return () => clearTimeout(id); }, []);
  if (!t) return null;
  return <div className="print-page">
    <div className="flex justify-between items-center wrap gap-2 no-print"><Button icon={<I.chevronLeft size={16} />} onClick={() => navigate("admin", `calculator-${encodeScenario(inputs)}`)}>Back to calculator</Button><span className="small muted">Use your browser's print command (Ctrl/Cmd+P) if the print dialog did not open. Inside Claude's viewer, printing may be unavailable; download the PDF instead.</span></div>
    <div><div className="eyebrow">GamePlanIQ · Field Improvement Fund Calculator</div><h1>{t.league.name}</h1><p className="muted">Prepared {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} by {t.userName(s.session?.userId)}</p></div>
    <h2>Scenario settings</h2><table className="print-table"><tbody><tr><td>Registered players</td><td className="num">{inputs.players.toLocaleString()}</td></tr><tr><td>Annual registration fee per player</td><td className="num">{fmtUSD(inputs.fee)}</td></tr><tr><td>Returned to the league per player</td><td className="num">{fmtUSD(inputs.league)}</td></tr><tr><td>Turf fund contribution per player</td><td className="num">{fmtUSD(inputs.turf)}</td></tr><tr><td>Platform / operator share per player</td><td className="num">{fmtUSD(r.platformPerPlayer)}</td></tr><tr><td>Estimated project cost ({preset})</td><td className="num"><strong>{fmtUSD(inputs.cost)}</strong></td></tr></tbody></table>
    <h2>Annual revenue breakdown</h2><table className="print-table"><tbody><tr><td><strong>Total annual registration revenue</strong></td><td className="num"><strong>{fmtUSD(r.totalRevenue)}</strong></td></tr><tr><td>Returned to the league ({r.pct.league}%)</td><td className="num">{fmtUSD(r.leagueRevenue)}</td></tr><tr><td>Deposited into the turf fund ({r.pct.turf}%)</td><td className="num">{fmtUSD(r.turfSavings)}</td></tr><tr><td>Platform / operator revenue ({r.pct.platform}%)</td><td className="num">{fmtUSD(r.platformRevenue)}</td></tr></tbody></table>
    <h2>Funding timeline</h2><p><strong style={{ fontSize: "1.5rem" }}>{tl.headline}</strong><br />{tl.detail} First-year progress: {r.firstYearPct}% of {fmtUSD(inputs.cost)}.</p>
    <h2>Ten-year savings projection</h2><table className="print-table"><thead><tr><th>Year</th><th className="num">Annual deposit</th><th className="num">Accumulated</th><th>Status</th></tr></thead><tbody>{r.projection.filter((p) => p.year > 0).map((p) => <tr key={p.year}><td>{p.year}</td><td className="num">{fmtUSD(p.annual)}</td><td className="num">{fmtUSD(p.cumulative)}</td><td>{p.funded ? (p.year === r.fundedYear ? "Goal reached" : "Funded") : `${Math.min(100, Math.round((p.cumulative / inputs.cost) * 100))}% of goal`}</td></tr>)}</tbody></table>
    <p className="small muted">Planning assumptions: registration occurs once per year and enrollment stays constant. Project cost presets are illustrative planning assumptions, not contractor quotes or guaranteed construction prices. Estimates exclude operating expenses, taxes, inflation, financing costs and investment returns.</p>
  </div>;
}
