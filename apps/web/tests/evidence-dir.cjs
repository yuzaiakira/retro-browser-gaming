/**
 * Resolve a Git-ignored evidence output directory for Playwright/browser tests.
 * Default: <repo>/.runtime/test-evidence/<suite>
 * Override: RBG_TEST_EVIDENCE_DIR (absolute or relative to cwd)
 */
const { mkdirSync } = require('fs');
const { join, isAbsolute } = require('path');

function evidenceDir(suite = 'misc') {
  const root = join(__dirname, '..', '..', '..');
  const override = process.env.RBG_TEST_EVIDENCE_DIR || process.env.EVIDENCE_DIR;
  let base;
  if (override) {
    base = isAbsolute(override) ? override : join(process.cwd(), override);
  } else {
    base = join(root, '.runtime', 'test-evidence');
  }
  const dir = join(base, suite);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'screenshots'), { recursive: true });
  return dir;
}

module.exports = { evidenceDir };
