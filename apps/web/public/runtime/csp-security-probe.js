(function () {
  var out = { evalOk: false, inlineWouldNeedSeparateDoc: true };
  try {
    out.evalResult = (0, eval)('1+1');
    out.evalOk = true;
  } catch (e) {
    out.evalOk = false;
    out.evalErr = String(e);
  }
  try {
    out.fnOk = true;
    out.fnResult = Function('return 4')();
  } catch (e) {
    out.fnOk = false;
    out.fnErr = String(e);
  }
  window.__RBG_CSP_PROBE = out;
  var el = document.getElementById('status');
  if (el) el.textContent = JSON.stringify(out);
})();
