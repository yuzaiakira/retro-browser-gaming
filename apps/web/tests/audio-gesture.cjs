/**
 * Software-side audio readiness: user-gesture → AudioContext running.
 * Does NOT prove human-heard output (AUD-001 still needs a listener).
 */
const { chromium } = require('@playwright/test');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const baseUrl = process.env.RETRO_TEST_BASE_URL || 'http://127.0.0.1:13000';
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const evidenceDir = resolveEvidenceDir('PH-08');

async function run() {
  mkdirSync(evidenceDir, { recursive: true });
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--autoplay-policy=document-user-activation-required'],
  });
  try {
    const page = await browser.newPage();
    await page.goto(`${baseUrl}/games/mit-genesis-breakout`, { waitUntil: 'domcontentloaded' });
    // Ensure install path exists; skip if already ready.
    const play = page.getByRole('link', { name: '▶ Play game' });
    if (!(await play.count())) {
      const download = page.getByRole('button', { name: 'Download & try on this device' });
      if (await download.isDisabled()) {
        const reason = await page.locator('.panel').first().innerText();
        throw new Error(`Cannot install Genesis for audio probe: ${reason.slice(0, 200)}`);
      }
      await download.click();
      await play.waitFor({ timeout: 300000 });
    }
    await play.click();
    await page.getByRole('button', { name: 'Save state', exact: true }).waitFor({ timeout: 180000 });

    // User gesture: click volume control / interact with page, then create AudioContext.
    await page.locator('.player-stage').click({ position: { x: 10, y: 10 } });
    const audio = await page.evaluate(async () => {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return { ok: false, reason: 'no-AudioContext' };
      const ctx = new Ctx();
      const before = ctx.state;
      await ctx.resume();
      // Short silent buffer proves graph can run after gesture.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      await new Promise((r) => setTimeout(r, 80));
      const after = ctx.state;
      await ctx.close();
      return { ok: after === 'running' || before === 'running', before, after, sampleRate: ctx.sampleRate };
    });
    if (!audio.ok) throw new Error(`AudioContext did not run after gesture: ${JSON.stringify(audio)}`);

    const result = {
      audio,
      humanAudible: 'NOT_VERIFIED — automated silence-level probe only; PH-08 AUD-001 needs a human listener',
      sinkHint: 'Use OS mixer to select C-Media USB or HDMI before human AUD-001',
    };
    writeFileSync(join(evidenceDir, 'audio-gesture-20261020.txt'), JSON.stringify(result, null, 2));
    console.log(`AUDIO_GESTURE_PASS ${JSON.stringify(audio)}`);
    console.log('AUD_001_HUMAN_STILL_REQUIRED');
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
