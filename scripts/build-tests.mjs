import { build } from "esbuild";
import { mkdirSync } from "node:fs";
mkdirSync("dist/test", { recursive: true });
await build({ entryPoints: ["src/engines/turfCalculator.ts", "src/engines/pdf.ts", "src/engines/scheduling.ts", "src/engines/eligibility.ts", "src/engines/pitchCount.ts", "src/engines/achievements.ts", "src/engines/search.ts", "src/engines/standings.ts", "src/engines/ics.ts", "src/engines/practiceGenerator.ts", "src/engines/coachPlanner.ts", "src/engines/draft.ts", "src/engines/reportCard.ts", "src/engines/gameDay.ts", "src/engines/certification.ts", "src/engines/importer.ts", "src/engines/season.ts", "src/engines/notify.ts", "src/engines/familyCalendar.ts", "src/engines/digest.ts", "src/engines/allstars.ts", "src/core/rbac.ts", "src/core/router.ts", "src/core/dates.ts"], bundle: true, format: "esm", platform: "node", outdir: "dist/test", outbase: "src", outExtension: { ".js": ".mjs" }, logLevel: "warning" });
console.log("test bundles ready");
