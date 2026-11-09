import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const shim = (f) => join(root, "src/shims", f);
const result = await build({
  entryPoints: [join(root, "src/main.tsx")],
  bundle: true,
  format: "iife",
  target: ["es2020"],
  outfile: join(dist, "app.js"),
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  jsx: "automatic",
  jsxImportSource: "react",
  alias: {
    "react/jsx-runtime": shim("jsx-runtime.cjs"),
    "react/jsx-dev-runtime": shim("jsx-runtime.cjs"),
    "react-dom/client": shim("react-dom-client.cjs"),
    "react-dom": shim("react-dom.cjs"),
    "react": shim("react.cjs"),
  },
  define: { "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production") },
  logLevel: "info",
  metafile: true,
});

// CSS: concatenate design + component stylesheets in order and inline them into the page.
const cssDir = join(root, "src/design");
const cssOrder = ["tokens.css", "base.css", "components.css", "shell.css", "features.css"];
const css = cssOrder.filter((f) => existsSync(join(cssDir, f))).map((f) => readFileSync(join(cssDir, f), "utf8")).join("\n\n");
const template = readFileSync(join(root, "artifact/index.template.html"), "utf8");
const buildId = Date.now().toString(36);
const html = template.replace("/*__CSS__*/", css).replace("__BUILD_ID__", buildId);
writeFileSync(join(dist, "index.html"), html);
// A standalone copy for local browsers (wrapped in the same skeleton the publisher adds).
writeFileSync(join(dist, "local.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`);

// Data: content + demo JSON ship as supporting files, fetched at runtime.
cpSync(join(root, "data"), join(dist, "data"), { recursive: true });
if (existsSync(join(root, "artifact/assets"))) cpSync(join(root, "artifact/assets"), join(dist, "assets"), { recursive: true });

function walk(dir) { let n = 0, bytes = 0; for (const f of readdirSync(dir)) { const p = join(dir, f); const s = statSync(p); if (s.isDirectory()) { const r = walk(p); n += r.n; bytes += r.bytes; } else { n++; bytes += s.size; } } return { n, bytes }; }
const stats = walk(dist);
const appBytes = statSync(join(dist, "app.js")).size;
console.log(`build ${buildId}: app.js ${(appBytes / 1024).toFixed(0)} KB, ${stats.n} files, ${(stats.bytes / 1024 / 1024).toFixed(2)} MB total`);
