const RD = globalThis.ReactDOM;
if (!RD) throw new Error("ReactDOM UMD global not loaded before app bundle");
module.exports = RD;
