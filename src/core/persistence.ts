/* Persistence adapters. Mutable state is stored as an overlay of documents over the seed data:
   artifact `db` (shared, durable, per-artifact) when the viewer can run it, otherwise browser-local storage.
   Paths: t/<leagueId>/<collection>/<docId> (tenant data) and platform/<collection>/<docId>. */
import { store, TENANT_COLLECTIONS, PLATFORM_COLLECTIONS, type CollectionName, type Overlay } from "./store";
import { safeLocalGet, safeLocalSet } from "./util";

type DBNs = any; // Claude db namespace (typed in artifact-capabilities contract); kept loose for bundling without ambient types

export interface Persistence {
  mode: "artifact-db" | "local" | "memory";
  startTenant(leagueId: string): () => void;      // subscribes/loads all tenant collections; returns stop()
  startPlatform(): () => void;
  put(leagueId: string | null, col: CollectionName, id: string, doc: any): Promise<void>;
  remove(leagueId: string | null, col: CollectionName, id: string, seeded: boolean): Promise<void>;
}

const pathFor = (leagueId: string | null, col: CollectionName) => leagueId ? `t/${leagueId}/${col}` : `platform/${col}`;

export function createLocalPersistence(mode: "local" | "memory" = "local"): Persistence {
  const mem = new Map<string, Overlay>();
  const key = (leagueId: string | null, col: CollectionName) => `gameplaniq:v1:${pathFor(leagueId, col)}`;
  const read = (leagueId: string | null, col: CollectionName): Overlay => {
    const k = key(leagueId, col); if (mem.has(k)) return mem.get(k)!;
    let docs: Overlay = {}; if (mode === "local") { const raw = safeLocalGet(k); if (raw) { try { docs = JSON.parse(raw); } catch { docs = {}; } } }
    mem.set(k, docs); return docs;
  };
  const write = (leagueId: string | null, col: CollectionName, docs: Overlay) => { const k = key(leagueId, col); mem.set(k, docs); if (mode === "local") safeLocalSet(k, JSON.stringify(docs)); };
  return {
    mode,
    startTenant(leagueId) {
      const all: Partial<Record<CollectionName, Overlay>> = {}; for (const c of TENANT_COLLECTIONS) all[c] = read(leagueId, c);
      store.set({ tenantOverlays: all, overlayTenantId: leagueId, persistence: { mode, status: "live", message: mode === "local" ? "Changes are saved in this browser only." : "Changes are kept for this visit only." } });
      return () => {};
    },
    startPlatform() { const all: Partial<Record<CollectionName, Overlay>> = {}; for (const c of PLATFORM_COLLECTIONS) all[c] = read(null, c); store.set({ platformOverlays: all }); return () => {}; },
    async put(leagueId, col, id, doc) { const docs = { ...read(leagueId, col), [id]: doc }; write(leagueId, col, docs); store.setOverlayDocs(leagueId ? "tenant" : "platform", col, { [id]: doc }); },
    async remove(leagueId, col, id, seeded) { const docs = { ...read(leagueId, col) }; if (seeded) docs[id] = { id, _deleted: true }; else delete docs[id]; write(leagueId, col, docs); store.setOverlayDocs(leagueId ? "tenant" : "platform", col, docs, true); },
  };
}

export function createArtifactDbPersistence(db: DBNs): Persistence {
  const local = createLocalPersistence("memory"); // in-memory mirror for synchronous reads
  function subscribeAll(leagueId: string | null, cols: CollectionName[], scope: "tenant" | "platform") {
    const unsubs: (() => void)[] = []; const pending = new Set<CollectionName>(cols);
    const timer = setTimeout(() => { if (pending.size) store.set((s) => ({ persistence: { ...s.persistence, status: "stale", message: "Some data could not be reached yet and may be out of date." } })); }, 10000);
    for (const col of cols) {
      try {
        const q = db.collection(pathFor(leagueId, col));
        const unsub = q.onSnapshot((snap: any) => {
          const docs: Overlay = {}; for (const d of snap.docs) { const body = d.data(); if (body) docs[d.id] = { ...body, id: body.id ?? d.id }; }
          store.setOverlayDocs(scope, col, docs, true);
          if (!snap.metadata.fromCache) { pending.delete(col); if (pending.size === 0) { clearTimeout(timer); store.set((s) => ({ persistence: { ...s.persistence, status: "live", message: "Saved to this artifact's shared database." } })); } }
        }, (e: any) => { pending.delete(col); console.warn("db subscription ended", col, e?.code); if (e?.code === "revoked") store.set((s) => ({ persistence: { ...s.persistence, status: "offline", message: "Database access ended. Reload to reconnect." } })); });
        unsubs.push(unsub);
      } catch (e) { console.error("db subscribe failed", col, e); pending.delete(col); }
    }
    return () => { clearTimeout(timer); for (const u of unsubs) u(); };
  }
  return {
    mode: "artifact-db",
    startTenant(leagueId) {
      store.set({ tenantOverlays: {}, overlayTenantId: leagueId, persistence: { mode: "artifact-db", status: "connecting", message: "Connecting to the shared database…" } });
      return subscribeAll(leagueId, TENANT_COLLECTIONS, "tenant");
    },
    startPlatform() { return subscribeAll(null, PLATFORM_COLLECTIONS, "platform"); },
    async put(leagueId, col, id, doc) {
      store.setOverlayDocs(leagueId ? "tenant" : "platform", col, { [id]: doc }); // optimistic
      try { await db.doc(`${pathFor(leagueId, col)}/${id}`).set(JSON.parse(JSON.stringify(doc))); }
      catch (e: any) {
        if (e?.code === "unavailable") { await new Promise((r) => setTimeout(r, 400 + Math.random() * 400)); try { await db.doc(`${pathFor(leagueId, col)}/${id}`).set(JSON.parse(JSON.stringify(doc))); return; } catch { /* fall through */ } }
        console.error("db write failed", col, id, e); store.toast(e?.code === "invalid_argument" ? "You do not have permission to save shared data in this artifact." : "Could not save. Please try again.", "error"); throw e;
      }
    },
    async remove(leagueId, col, id, seeded) {
      if (seeded) { await this.put(leagueId, col, id, { id, _deleted: true }); return; }
      store.set((s) => { const key = leagueId ? "tenantOverlays" : "platformOverlays"; const next = { ...(s[key][col] ?? {}) }; delete next[id]; return { [key]: { ...s[key], [col]: next } } as any; });
      try { await db.doc(`${pathFor(leagueId, col)}/${id}`).delete(); } catch (e) { console.error("db delete failed", e); store.toast("Could not delete. Please try again.", "error"); throw e; }
    },
  };
}

let active: Persistence = createLocalPersistence("memory");
export function setPersistence(p: Persistence) { active = p; }
export function persistence() { return active; }
