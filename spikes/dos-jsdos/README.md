# DOS js-dos spike notes

Playable production path: `apps/web/public/runtime/dos-frame.*` + `apps/web/public/cores/jsdos-8.3.8/`.

EmulatorJS `dosbox_pure` on 4.2.3 remains unplayable (OpenGL/GLES + WASM OOB) even with BOOTUP.BAT backport — see `docs/test-evidence/PH-05/dos-dosbox-pure-spike-20261020.md` and `dos-gameplay-20261021.md`.

Smoke: `node apps/web/tests/dos-jsdos-smoke.cjs`
