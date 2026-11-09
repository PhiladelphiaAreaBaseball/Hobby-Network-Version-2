/* Bootstraps the Claude artifact runtime capabilities. Everything degrades gracefully when absent (local file, preview, signed-out viewer). */
import { store } from "./store";
import { createArtifactDbPersistence, createLocalPersistence, setPersistence } from "./persistence";

declare global { interface Window { claude?: { use: (name: string) => Promise<any> } } }
const caps: { db: any; user: any; sample: any; assets: any; downloads: any } = { db: null, user: null, sample: null, assets: null, downloads: null };
export const capability = () => caps;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> { return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]); }

export async function initCapabilities(): Promise<void> {
  const use = window.claude?.use;
  if (!use) { setPersistence(createLocalPersistence("local")); store.set((s) => ({ caps: { ...s.caps, resolved: true }, persistence: { mode: "local", status: "live", message: "Running outside the Claude viewer. Changes are saved in this browser only." } })); return; }
  const [db, user, sample, assets, downloads] = await Promise.all([
    withTimeout(use("db"), 11000), withTimeout(use("user"), 11000), withTimeout(use("sample"), 11000), withTimeout(use("assets"), 11000), withTimeout(use("downloads"), 11000),
  ]);
  Object.assign(caps, { db, user, sample, assets, downloads });
  let viewer = null as any;
  if (user) {
    try { const me = await user.me(); const canWrite = await user.can("data.write"); viewer = { id: me.id, name: me.name || "", isOwner: me.isOwner, canEdit: me.canEdit, canWriteData: canWrite }; } catch { viewer = null; }
  }
  // Visitors who can open the page but may not write shared data (view-only shares, public links) get browser-local storage so demo mode never errors.
  const readOnlyViewer = viewer?.canWriteData === false;
  if (db && !readOnlyViewer) setPersistence(createArtifactDbPersistence(db)); else setPersistence(createLocalPersistence("local"));
  store.set((s) => ({ viewer, caps: { db: !!db, user: !!user, sample: !!sample, assets: !!assets, downloads: !!downloads, resolved: true }, persistence: db && !readOnlyViewer ? s.persistence : { mode: "local", status: "live", message: readOnlyViewer ? "Demo mode: your changes are saved in this browser only." : "Sign in to Claude to save changes to the shared database. For now, changes are saved in this browser only." } }));
}
