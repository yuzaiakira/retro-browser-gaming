# Known limitations

1. PS1 and PSP are not published or accepted. Their legal asset provenance, BIOS/homebrew toolchain availability on this host, threaded runtime/large-ISO on-demand VFS proof, and gameplay evidence remain blockers.
2. Chunked MEMFS loading removes full-file JavaScript `ArrayBuffer` copies, but the WASM heap still holds loaded media after mount. Multi-gigabyte streaming VFS is not proven.
3. Offline HTML5 works in tested Chromium. Offline WASM-core installed-release restart, cache eviction, core-missing recovery, and service-worker update-during-play have not been accepted.
4. Mobile layout has a Chromium 360 px regression test. Firefox catalog discovery is smoke-tested. Physical touch, gamepad, audio, Android, and Safari/iOS are not verified.
5. The Genesis homebrew test confirms core boot, gameplay, and control dispatch, not a public redistribution approval for that core. See `docs/licenses-and-assets.md`.
6. A full dependency/SBOM/vulnerability audit, load test, restore drill, remote CI run, and production deployment remain outstanding.
