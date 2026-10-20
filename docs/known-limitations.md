# Known limitations

1. PS1 and PSP core-smoke gameplay is verified with first-party MIT Dot fixtures, but they are not published catalog releases. Catalog install, SW cold-start offline launch, and redistribution review remain open.
2. On-demand BlobFS avoids MEMFS full-file copies for PS1/PSP and large Files (EMU-004 scoped). Browser blob storage for a held `File` still occupies process memory; Playwright PID/RSS sampling was unavailable on this host.
3. Offline HTML5 works in tested Chromium. Offline WASM-core installed-release restart, cache eviction, core-missing recovery, and service-worker update-during-play have not been accepted.
4. Mobile layout has a Chromium 360 px regression test. Firefox catalog discovery is smoke-tested. Physical touch, gamepad, audio, Android, and Safari/iOS are not verified.
5. Genesis/PS1/PSP homebrew tests confirm core boot, gameplay, and control dispatch, not a public redistribution approval for those cores. See `docs/licenses-and-assets.md`.
6. A full dependency/SBOM/vulnerability audit, load test, restore drill, remote CI run, and production deployment remain outstanding.
