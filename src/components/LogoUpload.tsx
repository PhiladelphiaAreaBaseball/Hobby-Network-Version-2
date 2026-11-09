import { useState } from "react";
import { Button } from "./ui";
import { I } from "./icons";
import { capability } from "../core/capabilities";
import { store, useAppState } from "../core/store";
import { actions, run } from "../core/actions";
/** Upload a square logo through the artifact assets capability; falls back to a short note where uploads are unavailable. */
export function LogoUpload({ kind, id, current, label = "Logo" }: { kind: "team" | "sponsor" | "league"; id: string; current?: string; label?: string }) {
  const hasAssets = useAppState((s) => s.caps.assets); const [busy, setBusy] = useState(false);
  const pick = async (f: File | null) => { if (!f) return; setBusy(true); try { const res = await capability().assets.upload(f); await run(() => actions.setLogo(kind, id, res.id), `${label} updated.`); } catch (e: any) { store.toast(e?.code === "too_large" ? "That image is too large." : "Upload failed.", "error"); } finally { setBusy(false); } };
  if (!hasAssets) return <span className="xsmall muted" title="Logo uploads are available to the artifact's editors inside Claude">{current ? "Logo set" : "Logo upload available to editors in Claude"}</span>;
  return <span className="flex items-center gap-2"><label className="btn btn-sm" style={{ cursor: "pointer" }}><I.upload size={14} />{busy ? "Uploading…" : current ? `Replace ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style={{ display: "none" }} onChange={(e) => pick(e.target.files?.[0] ?? null)} aria-label={`${label} file`} /></label>{current && <Button size="sm" variant="ghost" onClick={() => run(() => actions.setLogo(kind, id, null), `${label} removed.`)}>Remove</Button>}</span>;
}
