// Minimal automatic-runtime shim over the React UMD global (React 18 exposes jsx runtime only as a separate module).
const R = globalThis.React;
const Fragment = R.Fragment;
function jsx(type, props, key) {
  if (key !== undefined) props = Object.assign({}, props, { key });
  return R.createElement(type, props);
}
module.exports = { jsx, jsxs: jsx, Fragment };
