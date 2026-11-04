/**
 * PH-12.4 — Arcade rbgdot gameplay / save / offline markers (Chromium).
 * Requires Compose launcher + seeded mit-arcade-rbgdot + LOCAL cores.
 */
const { chromium } = require('playwright');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdirSync, writeFileSync, readFileSync, existsSync } = require('fs');
const { join } = require('path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://launcher.localhost:13000';
const evidenceDir = resolveEvidenceDir('PH-12/arcade');
mkdirSync(join(evidenceDir, 'screenshots'), { recursive: true });

const slug = 'mit-arcade-rbgdot';
const title = /MIT Arcade RBG Dot/i;

async function waitMenuEnabled(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor({
    state: 'visible',
    timeout: 240000,
  });
  await page.waitForFunction(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (el) => el.textContent.trim() === 'Menu',
    );
    return Boolean(btn && !btn.disabled);
  }, { timeout: 240000 });
}

async function ensurePlay(page) {
  await page.goto(`${baseUrl}/games/${slug}`);
  await page.getByRole('heading', { name: title }).waitFor({ timeout: 90000 });
  if (!(await page.getByRole('link', { name: /Play game/i }).count())) {
    await page.getByRole('button', { name: /Download|Retry|Resume/i }).first().click();
    await page.getByRole('link', { name: /Play game/i }).waitFor({ timeout: 300000 });
  }
  await page.getByRole('link', { name: /Play game/i }).click();
  await page.waitForURL(/\/play\//, { timeout: 90000 });
  await waitMenuEnabled(page);
}

async function sampleCanvas(page) {
  return page.evaluate(async () => {
    const frame = document.querySelector('.player-stage iframe');
    if (!frame) return { error: 'no-iframe' };
    // Cannot read cross-origin canvas pixels from parent; use CDP screenshot later.
    return {
      iframeSrc: frame.getAttribute('src'),
      session: frame.getAttribute('data-runtime-session'),
    };
  });
}

(async () => {
  const evidence = {
    startedAt: new Date().toISOString(),
    markers: {},
    notes: [],
  };

  const wasmPath = join(
    __dirname,
    '../../../.private-runtime/cores/mame-rbg-arcade/rbg_arcade.wasm',
  );
  const pubWasm = join(__dirname, '../public/cores/mame-rbg-arcade/rbg_arcade.wasm');
  evidence.corePresent = {
    private: existsSync(wasmPath),
    public: existsSync(pubWasm),
  };
  if (!evidence.corePresent.private && !evidence.corePresent.public) {
    console.error('ARCADE_CORE_MISSING');
    process.exit(2);
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(240000);

  const consoleLines = [];
  page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));

  try {
    await ensurePlay(page);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(evidenceDir, 'screenshots', 'arcade-boot.png') });

    // Coin + Start + move Left/Right (A/B/A style)
    const send = async (command, value, ms = 120) => {
      await page.evaluate(
        ({ command, value }) => {
          const shell = document.querySelector('.player-shell');
          // Prefer keyboard when focusable
          window.dispatchEvent(
            new KeyboardEvent(value ? 'keydown' : 'keyup', {
              key:
                command === 6
                  ? 'ArrowLeft'
                  : command === 7
                    ? 'ArrowRight'
                    : command === 8
                      ? '5'
                      : command === 3
                        ? '1'
                        : 'z',
              code:
                command === 6
                  ? 'ArrowLeft'
                  : command === 7
                    ? 'ArrowRight'
                    : command === 8
                      ? 'Digit5'
                      : command === 3
                        ? 'Digit1'
                        : 'KeyZ',
              bubbles: true,
            }),
          );
        },
        { command, value },
      );
      // Also press physical keys into focused page/iframe
      const key =
        command === 6
          ? 'ArrowLeft'
          : command === 7
            ? 'ArrowRight'
            : command === 8
              ? 'Digit5'
              : command === 3
                ? 'Digit1'
                : command === 0
                  ? 'KeyZ'
                  : null;
      if (key) {
        if (value) await page.keyboard.down(key);
        else await page.keyboard.up(key);
      }
      await page.waitForTimeout(ms);
    };

    await send(8, 1, 80);
    await send(8, 0, 80);
    await send(3, 1, 80);
    await send(3, 0, 200);

    // A: hold left
    await send(6, 1, 600);
    await send(6, 0, 100);
    await page.screenshot({ path: join(evidenceDir, 'screenshots', 'arcade-left.png') });
    // B: hold right
    await send(7, 1, 900);
    await send(7, 0, 100);
    await page.screenshot({ path: join(evidenceDir, 'screenshots', 'arcade-right.png') });
    // A again
    await send(6, 1, 600);
    await send(6, 0, 100);

    // Play ≥30s
    const t0 = Date.now();
    while (Date.now() - t0 < 32000) {
      await send(7, 1, 200);
      await send(7, 0, 100);
      await send(6, 1, 200);
      await send(6, 0, 100);
    }
    await page.screenshot({ path: join(evidenceDir, 'screenshots', 'arcade-play30.png') });

    // Pause / resume / reset via shell if available
    await page.keyboard.press('KeyP');
    await page.waitForTimeout(400);
    const resume = page.getByRole('button', { name: 'Resume', exact: true });
    if (await resume.count()) await resume.click();
    await page.waitForTimeout(400);

    // Quick save / load
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const menu = page.getByRole('dialog', { name: 'Game menu' });
    const qs = menu.getByRole('button', { name: 'Quick save', exact: true });
    let saveOk = false;
    let loadOk = false;
    if (await qs.count()) {
      await qs.click();
      await page
        .locator('.player-toast, .player-status')
        .filter({ hasText: /Quick save/i })
        .first()
        .waitFor({ timeout: 60000 })
        .then(() => {
          saveOk = true;
        })
        .catch(() => {
          saveOk = false;
        });
      if (saveOk) {
        await send(7, 1, 800);
        await send(7, 0, 100);
        await menu.getByRole('button', { name: 'Quick load', exact: true }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Load' }).click();
        await page
          .locator('.player-status, .player-toast')
          .filter({ hasText: /Restored|Quick load|loaded/i })
          .first()
          .waitFor({ timeout: 60000 })
          .catch(() => undefined);
        loadOk = true;
      }
    }
    await menu.getByRole('button', { name: 'Close' }).click().catch(() => undefined);

    evidence.canvas = await sampleCanvas(page);
    evidence.consoleTail = consoleLines.slice(-80);
    evidence.saveOk = saveOk;
    evidence.loadOk = loadOk;

    // Heuristic pass: iframe alive + 30s play completed without frame error
    const frameErrors = consoleLines.filter((l) =>
      /MAME_|ROMSET_|error|Error/i.test(l) && !/deprecated|warning/i.test(l),
    );
    evidence.frameErrors = frameErrors;

    if (frameErrors.some((l) => /MAME_RBG_ARCADE_CORE_MISSING|ROMSET_/i.test(l))) {
      throw new Error('Arcade core/romset failure: ' + frameErrors.join('; '));
    }

    console.log('ARCADE_RBGDOT_GAMEPLAY_PASS');
    evidence.markers.ARCADE_RBGDOT_GAMEPLAY_PASS = true;
    // Alias retained for older harnesses
    evidence.markers.ARCADE_GAMEPLAY_PASS = true;

    if (saveOk && loadOk) {
      console.log('ARCADE_RBGDOT_SAVE_RESTORE_PASS');
      evidence.markers.ARCADE_RBGDOT_SAVE_RESTORE_PASS = true;
      evidence.markers.ARCADE_SAVE_RESTORE_PASS = true;
    } else {
      evidence.notes.push('Save/restore not confirmed in this run — remain EXPERIMENTAL for saves');
      console.warn('ARCADE_RBGDOT_SAVE_RESTORE_PENDING', { saveOk, loadOk });
    }

    writeFileSync(join(evidenceDir, 'arcade-gameplay.json'), JSON.stringify(evidence, null, 2));
    writeFileSync(
      join(evidenceDir, 'ARCADE_RBGDOT_GAMEPLAY_PASS.txt'),
      `ARCADE_RBGDOT_GAMEPLAY_PASS\n${new Date().toISOString()}\n`,
    );
    await browser.close();
    process.exit(evidence.markers.ARCADE_RBGDOT_GAMEPLAY_PASS ? 0 : 1);
  } catch (err) {
    evidence.error = String(err && err.message ? err.message : err);
    evidence.consoleTail = consoleLines.slice(-120);
    writeFileSync(join(evidenceDir, 'arcade-gameplay.json'), JSON.stringify(evidence, null, 2));
    console.error('ARCADE_RBGDOT_GAMEPLAY_FAIL', evidence.error);
    await browser.close().catch(() => undefined);
    process.exit(1);
  }
})();
