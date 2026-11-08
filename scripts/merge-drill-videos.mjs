/* Merges researched drill-video part files into data/content/drill-videos.json (one verified YouTube video per drill). */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
const drills = ["drills-hitting", "drills-fielding", "drills-throwing", "drills-baserunning", "drills-general", "drills-positions-mental"].flatMap((f) => JSON.parse(readFileSync(`data/content/${f}.json`, "utf8")).items); const drillIds = new Set(drills.map((d) => d.id));
const existing = existsSync("data/content/drill-videos.json") ? JSON.parse(readFileSync("data/content/drill-videos.json", "utf8")).items : [];
const byDrill = new Map(existing.map((v) => [v.drillId, v])); let added = 0; const problems = [];
for (let i = 1; i <= 9; i++) { const f = `data/content/drill-videos-part-${i}.json`; if (!existsSync(f)) continue; for (const v of JSON.parse(readFileSync(f, "utf8")).items) { if (!drillIds.has(v.drillId)) { problems.push(`${f}: unknown drill ${v.drillId}`); continue; } if (!/^[A-Za-z0-9_-]{11}$/.test(v.videoId) || v.url !== `https://www.youtube.com/watch?v=${v.videoId}` || !v.title || !v.channel) { problems.push(`${f}: malformed entry for ${v.drillId}`); continue; } byDrill.set(v.drillId, { id: v.drillId, ...v }); added++; } unlinkSync(f); }
const items = [...byDrill.values()].sort((a, b) => a.drillId.localeCompare(b.drillId));
writeFileSync("data/content/drill-videos.json", JSON.stringify({ $schema: "drill_video", items }, null, 1));
console.log(`drill videos: ${items.length} total (${added} merged)`); if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
