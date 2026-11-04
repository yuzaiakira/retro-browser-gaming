/**
 * Must load before /cores/ruffle-0.7.1/ruffle.js.
 * Disables global Flash polyfill and pins offline-safe defaults.
 */
window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = {
  publicPath: "/cores/ruffle-0.7.1/",
  polyfills: false,
  autoplay: "on",
  unmuteOverlay: "hidden",
  letterbox: "on",
  allowScriptAccess: false,
  allowNetworking: "none",
  contextMenu: "off",
  splashScreen: false,
};
