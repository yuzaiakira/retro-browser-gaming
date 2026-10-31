/**
 * Vectrex / vecx fail-closed gate (no proprietary BIOS in tree).
 *
 * Proves:
 * - MIT fixture is present and hashed
 * - user-bios slot requires system.img for core vecx
 * - Does NOT claim interactive gameplay (BLOCKED_EXTERNAL without lawful BIOS)
 *
 * Usage: node tests/vectrex-bios-gate-smoke.cjs
 */
const { createHash } = require('node:crypto');
const { readFileSync, mkdirSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { evidenceDir: resolveEvidenceDir } = require('./evidence-dir');

const root = join(__dirname, '..', '..', '..');
const fixture = join(root, '.fixtures', 'mit-vectrex-dot.bin');
const expectSha = '9fed4d5143348cd3aae9a1fbe546c0a809399d1008341d7f95781b0cf4d22ace';
const evidenceDir = resolveEvidenceDir('PH-12');
mkdirSync(join(evidenceDir, 'vectrex'), { recursive: true });

const privateBios = join(root, '.private-runtime', 'firmware', 'vectrex', 'system.img');

(async () => {
  const evidence = {
    status: 'BLOCKED_EXTERNAL',
    firmware: 'USER_SUPPLIED_ONLY',
    proprietaryEmbed: 'forbidden',
    gates: {},
  };

  if (!existsSync(fixture)) throw new Error('missing mit-vectrex-dot.bin');
  const bytes = readFileSync(fixture);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== expectSha) throw new Error(`fixture sha mismatch ${sha}`);
  evidence.gates.fixtureSha = sha;
  evidence.gates.fixtureBytes = bytes.length;

  // Import user-bios module via vitest-free dynamic path check on source text
  const userBiosSrc = readFileSync(
    join(root, 'apps/web/src/emulators/user-bios.ts'),
    'utf8',
  );
  if (!/id:\s*"vectrex"/.test(userBiosSrc)) throw new Error('vectrex slot missing');
  if (!/cores:\s*\["vecx"\]/.test(userBiosSrc)) throw new Error('vecx core not gated');
  if (!/preferredFilename:\s*"system\.img"/.test(userBiosSrc)) {
    throw new Error('system.img preferred name missing');
  }
  evidence.gates.userBiosSlot = true;

  const registry = readFileSync(join(root, 'apps/web/src/emulators/registry.ts'), 'utf8');
  if (!registry.includes("'vecx'")) throw new Error('vecx not in registry allowlist');
  evidence.gates.registryAllowlist = true;

  const patch = readFileSync(
    join(root, 'scripts/patches/vecx/0001-rbg-external-vectrex-bios.patch'),
    'utf8',
  );
  if (!patch.includes('RBG_EXTERNAL_VECTREX_BIOS')) {
    throw new Error('external BIOS patch missing marker');
  }
  if (!patch.includes('MISSING_VECTREX_BIOS')) {
    throw new Error('fail-closed log string missing from patch');
  }
  evidence.gates.externalBiosPatch = true;

  const hasLawfulBios = existsSync(privateBios) && readFileSync(privateBios).length === 8192;
  evidence.gates.privateBiosPresent = hasLawfulBios;
  if (hasLawfulBios) {
    evidence.status = 'BIOS_PRESENT_GAMEPLAY_UNVERIFIED';
    evidence.note =
      'system.img present locally — still require VECTREX_GAMEPLAY_PASS + offline PWA before VERIFIED_PLAYABLE';
  } else {
    evidence.note =
      'No authorized system.img in .private-runtime/firmware/vectrex/ — interactive gates not run';
  }

  writeFileSync(
    join(evidenceDir, 'vectrex', 'bios-gate.json'),
    JSON.stringify(evidence, null, 2),
  );
  writeFileSync(
    join(evidenceDir, 'vectrex', 'checks-bios-gate.txt'),
    [
      'VECTREX_BIOS_GATE_PASS',
      'STATUS=' + evidence.status,
      'VECTREX_GAMEPLAY_PASS=NOT_RUN',
      'VECTREX_OFFLINE_PWA_PASS=NOT_RUN',
      JSON.stringify(evidence.gates, null, 2),
    ].join('\n'),
  );
  console.log('VECTREX_BIOS_GATE_PASS', JSON.stringify(evidence));
  if (evidence.status === 'BLOCKED_EXTERNAL') {
    console.log('VECTREX_BLOCKED_EXTERNAL_NO_LAWFUL_BIOS');
  }
})().catch((e) => {
  console.error('VECTREX_BIOS_GATE_FAIL', e);
  process.exitCode = 1;
});
