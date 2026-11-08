const RD = globalThis.ReactDOM;
if (!RD) throw new Error("ReactDOM UMD global not loaded before app bundle");
module.exports = { createRoot: RD.createRoot, hydrateRoot: RD.hydrateRoot };
