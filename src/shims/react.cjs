const R = globalThis.React;
if (!R) throw new Error("React UMD global not loaded before app bundle");
module.exports = R;
