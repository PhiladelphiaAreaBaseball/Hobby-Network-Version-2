// Local static server for dist/ that mirrors the artifact viewer closely enough for Playwright:
// serves dist/local.html at "/", rewrites the two cdnjs React URLs to local node_modules copies.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
const reactLocal = {
  "/__local/react.js": join(root, "node_modules/react/umd/react.production.min.js"),
  "/__local/react-dom.js": join(root, "node_modules/react-dom/umd/react-dom.production.min.js"),
};
createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let path = decodeURIComponent(url.pathname);
  if (reactLocal[path]) { res.writeHead(200, { "content-type": types[".js"] }); res.end(readFileSync(reactLocal[path])); return; }
  if (path === "/" || path === "/index.html") {
    let html = readFileSync(join(dist, "local.html"), "utf8");
    html = html.replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/react\/[^"]+/, "/__local/react.js").replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/react-dom\/[^"]+/, "/__local/react-dom.js");
    res.writeHead(200, { "content-type": types[".html"] }); res.end(html); return;
  }
  const file = join(dist, path);
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end("not found: " + path); return; }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`serving dist on http://localhost:${port}`));
