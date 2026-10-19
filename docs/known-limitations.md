# Known limitations

1. Docker is unavailable in the execution environment. Compose, native PostgreSQL, and the source-built MinIO image are unverified despite real Garage S3 and PGlite protocol checks.
2. PS1 and PSP are not published or accepted. Their legal asset provenance, multi-file media support, BIOS policy, threaded runtime/large-file behavior, and gameplay evidence remain blockers.
3. The implemented downloader has not passed the PDR’s 100 MiB interruption/reload, two-tab, crash recovery, changed-manifest, quota, or 1 GiB bounded-memory acceptance tests.
4. Offline HTML5 works in tested Chromium. Offline WASM-core gameplay, cache eviction, core-missing recovery, and service-worker update-during-play have not been accepted.
5. The adapter deliberately rejects WASM game files over 256 MiB. This is an honest conservative limit while PS1/PSP seek/memory behavior is unverified.
6. Mobile layout has a Chromium 360 px regression test, but physical touch, gamepad, audio, Android, Firefox and Safari/iOS are not verified.
7. The Genesis homebrew test confirms core boot and control dispatch, not a public redistribution approval for that core. See `docs/licenses-and-assets.md`.
8. A full dependency/SBOM/vulnerability audit, load test, restore drill, remote CI run, and production deployment remain outstanding.
