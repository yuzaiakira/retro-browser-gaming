/**
 * js2me boot configuration (external file — CSP forbids inline scripts on /runtime/*).
 */
(function () {
  js2me.libraryPath = '/cores/js2me/js/me';
  js2me.config.app = false;
  js2me.config.engine = 'zazu';
  js2me.config.selector = false;
  js2me.config.workers = false;
  js2me.config.midlet = 1;
  js2me.config.width = 240;
  js2me.config.height = 320;
  js2me.config.fullHeight = 320;
  js2me.engine = '/cores/js2me/js/program_zazu.js';
  js2me.rmsQuotaBytes = 256 * 1024;
})();
