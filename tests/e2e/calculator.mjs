/* Browser check for the Field Improvement Fund Calculator: default example, slider interaction, share code, mobile layout. */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
const server = spawn("node", ["scripts/serve.mjs"], { stdio: "inherit", env: { ...process.env, PORT: "4173" } });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch(); const errors = [];
try {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("http://localhost:4173/"); await page.evaluate(() => localStorage.setItem("gameplaniq:v1:session", "persona_admin")); await page.goto("http://localhost:4173/#admin-calculator"); await page.reload();
  await page.waitForSelector('[data-testid="timeline-years"]', { timeout: 15000 });
  const read = async () => ({ years: await page.textContent('[data-testid="timeline-years"]'), total: await page.textContent('[data-testid="fin-total-annual-registration-revenue"]'), league: await page.textContent('[data-testid="fin-annual-revenue-returned-to-league"]'), turf: await page.textContent('[data-testid="fin-annual-turf-fund-savings"]'), platform: await page.textContent('[data-testid="fin-annual-platform-operator-revenue"]') });
  const d = await read(); console.log("defaults", d);
  const expect = { years: "3.75 years", total: "$120,000", league: "$60,000", turf: "$40,000", platform: "$20,000" };
  for (const k of Object.keys(expect)) if (d[k] !== expect[k]) throw new Error(`default ${k}: ${d[k]} !== ${expect[k]}`);
  await page.screenshot({ path: "tests/e2e/screenshots/calculator-desktop.png", fullPage: true });
  // move the turf slider with the keyboard: +25 → $125 per player → $50,000/yr → 3 years
  await page.focus("#turf-range"); await page.keyboard.press("ArrowRight"); const d2 = await read(); console.log("after +25 turf", d2);
  if (d2.turf !== "$50,000" || d2.years !== "3.0 years" || d2.platform !== "$10,000") throw new Error("slider update failed: " + JSON.stringify(d2));
  // typed exact value with clamping: players 413 -> 425
  await page.fill("#players-number", "413"); await page.press("#players-number", "Enter"); const d3 = await read(); console.log("after typing 413 players", d3); if (d3.total !== "$127,500") throw new Error("typed input failed");
  // share: hash carries the scenario code
  await page.click("text=Share scenario"); await page.waitForTimeout(300); const hash = await page.evaluate(() => location.hash); console.log("share hash", hash); if (!/^#admin-calculator-p425-f300-l150-t125-c150000$/.test(hash)) throw new Error("share hash wrong: " + hash);
  await page.keyboard.press("Escape");
  // reset
  await page.click("text=Reset to defaults"); const d4 = await read(); if (d4.years !== "3.75 years") throw new Error("reset failed");
  // zero allocation message
  await page.fill("#turf-number", "0"); await page.press("#turf-number", "Enter"); const d5 = await read(); if (d5.years !== "No funding allocated") throw new Error("zero handling failed: " + d5.years);
  await page.click("text=Reset to defaults");
  // print view renders (frame without shell)
  await page.goto("http://localhost:4173/#admin-calculator-print-p400-f300-l150-t100-c150000"); await page.waitForSelector(".print-page"); const printText = await page.textContent(".print-page"); if (!printText.includes("3.75 years") || !printText.includes("$160,000")) throw new Error("print view wrong");
  // PDF bytes
  await page.goto("http://localhost:4173/#admin-calculator"); await page.waitForSelector('[data-testid="timeline-years"]');
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 10000 }), page.click("text=Download PDF")]); const path = await download.path(); const { readFileSync } = await import("node:fs"); const head = readFileSync(path).subarray(0, 8).toString("latin1"); console.log("pdf", download.suggestedFilename(), head); if (!head.startsWith("%PDF-1.4")) throw new Error("pdf invalid");
  // saved scenario (local persistence)
  await page.click("text=Save scenario"); await page.fill("input[placeholder='Current Enrollment']", "Growth Scenario"); await page.click(".modal-foot >> text=Save"); await page.waitForSelector("text=Growth Scenario", { timeout: 5000 }); console.log("scenario saved");
  // mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const mp = await mctx.newPage(); mp.on("pageerror", (e) => errors.push(String(e)));
  await mp.goto("http://localhost:4173/"); await mp.evaluate(() => localStorage.setItem("gameplaniq:v1:session", "persona_admin")); await mp.goto("http://localhost:4173/#admin-calculator"); await mp.reload(); await mp.waitForSelector('[data-testid="timeline-years"]');
  const scrollW = await mp.evaluate(() => document.documentElement.scrollWidth); if (scrollW > 390) throw new Error("horizontal overflow on mobile: " + scrollW);
  await mp.screenshot({ path: "tests/e2e/screenshots/calculator-mobile.png", fullPage: true });
  console.log("console errors:", errors.length ? errors : "none");
  if (errors.length) process.exitCode = 1;
} finally { await browser.close(); server.kill(); }
