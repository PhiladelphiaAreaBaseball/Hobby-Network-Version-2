/* A tiny PDF 1.4 writer (text, rectangles, lines) so the app can export summaries without a PDF library.
   Letter size, Helvetica. Coordinates are given from the top-left in points. */
type Color = [number, number, number];
export class SimplePdf {
  private pages: string[][] = []; private cur: string[] = []; readonly width = 612; readonly height = 792;
  constructor() { this.newPage(); }
  newPage() { this.cur = []; this.pages.push(this.cur); }
  private y(v: number) { return (this.height - v).toFixed(2); }
  private esc(s: string) { return s.replace(/[^\x20-\x7E]/g, (ch) => ({ "–": "-", "—": "-", "’": "'", "‘": "'", "“": '"', "”": '"', "·": "-", "…": "...", "×": "x" } as Record<string, string>)[ch] ?? "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
  text(x: number, y: number, str: string, size = 11, opts: { bold?: boolean; color?: Color; align?: "left" | "right" | "center"; maxWidth?: number } = {}) {
    const font = opts.bold ? "/F2" : "/F1"; const c = opts.color ?? [0.06, 0.1, 0.19];
    let tx = x; if (opts.align && opts.align !== "left") { const w = this.measure(str, size); tx = opts.align === "right" ? x - w : x - w / 2; }
    this.cur.push(`BT ${font} ${size} Tf ${c.map((v) => v.toFixed(3)).join(" ")} rg 1 0 0 1 ${tx.toFixed(2)} ${this.y(y + size * 0.8)} Tm (${this.esc(str)}) Tj ET`);
  }
  /** Rough Helvetica width (average glyph 0.52em). */
  measure(str: string, size: number) { return str.length * size * 0.52; }
  paragraph(x: number, y: number, str: string, size: number, maxWidth: number, opts: { color?: Color; bold?: boolean; lineHeight?: number } = {}): number {
    const words = str.split(/\s+/); const lines: string[] = []; let line = ""; const maxChars = Math.max(10, Math.floor(maxWidth / (size * 0.52)));
    for (const w of words) { if ((line + " " + w).trim().length > maxChars) { lines.push(line.trim()); line = w; } else line = (line + " " + w).trim(); } if (line) lines.push(line);
    const lh = opts.lineHeight ?? size * 1.4; lines.forEach((l, i) => this.text(x, y + i * lh, l, size, { color: opts.color, bold: opts.bold })); return y + lines.length * lh;
  }
  rect(x: number, y: number, w: number, h: number, fill: Color, stroke?: Color) { this.cur.push(`${fill.map((v) => v.toFixed(3)).join(" ")} rg ${x.toFixed(2)} ${(this.height - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); if (stroke) this.cur.push(`${stroke.map((v) => v.toFixed(3)).join(" ")} RG 0.75 w ${x.toFixed(2)} ${(this.height - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`); }
  line(x1: number, y1: number, x2: number, y2: number, color: Color, width = 1, dash?: string) { this.cur.push(`${color.map((v) => v.toFixed(3)).join(" ")} RG ${width} w ${dash ? `[${dash}] 0 d` : "[] 0 d"} ${x1.toFixed(2)} ${this.y(y1)} m ${x2.toFixed(2)} ${this.y(y2)} l S [] 0 d`); }
  build(): Uint8Array {
    const objs: string[] = []; const add = (s: string) => { objs.push(s); return objs.length; };
    const catalog = add(""); const pagesObj = add(""); const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const pageIds: number[] = [];
    for (const p of this.pages) { const content = p.join("\n"); const cId = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`); const pId = add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Contents ${cId} 0 R /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> >>`); pageIds.push(pId); }
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`; objs[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    let out = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"; const offsets: number[] = [];
    objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length; out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") + `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Uint8Array.from(out, (ch) => ch.charCodeAt(0) & 0xff);
  }
}
