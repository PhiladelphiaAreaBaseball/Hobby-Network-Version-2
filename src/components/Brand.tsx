/* GamePlanIQ brand: clipboard play-diagram mark and the wordmark. The wordmark is drawn as SVG text so it reads on dark
   chrome; the supplied raster logo (assets/gameplaniq-logo.png) is used on white surfaces. */
export function LogoMark({ size = 28, color = "currentColor" }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0 }}>
    <g transform="rotate(-6 32 34)"><rect x="12" y="12" width="40" height="46" rx="6" fill="none" stroke={color} strokeWidth="5" /><rect x="22" y="7" width="20" height="10" rx="2" fill={color} /><circle cx="32" cy="9" r="2.2" fill="var(--chrome, #0B1A30)" />
      <path d="M20 27l6 6M26 27l-6 6" stroke={color} strokeWidth="3.5" strokeLinecap="round" /><path d="M36 44l6 6M42 44l-6 6" stroke={color} strokeWidth="3.5" strokeLinecap="round" /><circle cx="21" cy="47" r="3.8" fill="none" stroke={color} strokeWidth="3.2" />
      <path d="M26 46c6-4 10-9 14-16" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" /><path d="M36 30l5-2-1 5" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></g></svg>;
}
export function Wordmark({ height = 22, on = "dark" }: { height?: number; on?: "dark" | "light" }) {
  const fg = on === "dark" ? "#FFFFFF" : "#0B1A30";
  return <svg height={height} viewBox="0 0 250 44" aria-label="GamePlanIQ" role="img" style={{ flexShrink: 0, maxWidth: "100%" }}>
    <text x="0" y="34" fontFamily="'Barlow Condensed', 'Arial Narrow', Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="40" fill={fg} letterSpacing="-0.5">GamePlan<tspan fill="#0D5BD9">IQ</tspan></text>
    <path d="M18 41 C 80 48, 170 48, 236 39" stroke="#0D5BD9" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>;
}
export function Logo({ on = "dark", height = 24 }: { on?: "dark" | "light"; height?: number }) { return <span className="flex items-center gap-2" style={{ color: on === "dark" ? "#fff" : "#0B1A30" }}><LogoMark size={height + 8} color={on === "dark" ? "#fff" : "#0B1A30"} /><Wordmark height={height} on={on} /></span>; }
export function LogoImage({ width = 320 }: { width?: number }) { return <img src="assets/gameplaniq-logo.png" alt="GamePlanIQ" style={{ width: "100%", maxWidth: width, height: "auto" }} />; }
