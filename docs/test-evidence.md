# Test evidence policy

Generated browser evidence (screenshots, Playwright profiles, suite stdout) is **not** stored in public Git.

- Local output: `.runtime/test-evidence/<suite>/` (Git-ignored)
- Override: `RBG_TEST_EVIDENCE_DIR` or `EVIDENCE_DIR`
- Public summary: `docs/qa-summary.md`
- Acceptance IDs: `docs/acceptance-matrix.md`
- Emulator build provenance: `docs/emulator-builds/`

Historical raw evidence may exist only in private operator archives.
