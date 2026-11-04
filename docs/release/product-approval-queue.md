# Product approval queue (PH-14)

**Generated:** 2026-11-04T07:16:10Z
**Total:** 53 · **pending:** 53 · **approved:** 0 · **rejected:** 0

## Workflow (validated, not executed for approvals)

- Engineering publish ≠ product approval (`publish()` leaves status pending).
- Approvals require `catalog.approve_game_product` (owner/staff with permission).
- Each transition appends `ProductApprovalDecision` (immutable).
- Production catalogs hide non-approved titles when `CATALOG_ALLOW_ENGINEERING` is false.
- **No titles were approved by this export.**

## Reviewer checklist (per title)

Copyright/authorization · game license · artwork · sound · firmware · core distribution clearance · provenance completeness.

Machine-readable: `product-approval-queue.json`.

- `cc0-a5200-culomin` — CC0 Atari 5200 Culomin (eng_ready=True, scope=engineering-demo)
- `gpl-a7800-rfk` — GPL Atari 7800 robotfindskitten (eng_ready=True, scope=engineering-demo)
- `gpl-atari-st-pongwars` — GPL Atari ST Pong Wars (eng_ready=True, scope=engineering-demo)
- `gpl-gb-big2small` — GPL GB Big2Small (eng_ready=True, scope=engineering-demo)
- `gpl-ngpc-test` — GPL NGPC Test (eng_ready=True, scope=engineering-demo)
- `gpl-ngp-joypad` — GPL NGP Joypad (eng_ready=True, scope=engineering-demo)
- `huc-pce-scroll` — HuC PCE Scroll (eng_ready=True, scope=engineering-demo)
- `mit-a2600-berta` — MIT Atari 2600 Berta (eng_ready=True, scope=engineering-demo)
- `mit-a2600-pipes` — MIT Atari 2600 Pipes (eng_ready=True, scope=engineering-demo)
- `mit-amiga-dot` — MIT Amiga Dot (eng_ready=True, scope=engineering-demo)
- `mit-arcade-rbgdot` — MIT Arcade RBG Dot (eng_ready=True, scope=engineering-demo)
- `mit-atari8-dot` — MIT Atari 8-bit Dot (eng_ready=True, scope=engineering-demo)
- `mit-c64-wildboa` — MIT C64 Wild Snake Boa (eng_ready=True, scope=engineering-demo)
- `mit-coleco-retropipe` — MIT ColecoVision RetroPIPE (eng_ready=True, scope=engineering-demo)
- `mit-cpc-brickblaster` — MIT CPC Brick Blaster (eng_ready=True, scope=engineering-demo)
- `mit-dos-floppybird` — MIT DOS Floppy Bird (eng_ready=True, scope=engineering-demo)
- `mit-dreamcast-dot` — MIT Dreamcast Dot (eng_ready=True, scope=engineering-demo)
- `mit-dreamcast-dot-chd` — MIT Dreamcast Dot CHD (eng_ready=True, scope=engineering-demo)
- `mit-dreamcast-dot-gdi` — MIT Dreamcast Dot GDI (eng_ready=True, scope=engineering-demo)
- `mit-dreamcast-dot-multidisc` — MIT Dreamcast Dot Multi-Disc (eng_ready=True, scope=engineering-demo)
- `mit-fds-move-demo` — MIT FDS Move Demo (eng_ready=True, scope=engineering-demo)
- `mit-flash-dot` — MIT Flash Dot (eng_ready=True, scope=engineering-demo)
- `mit-gba-dino` — MIT GBA Dino (eng_ready=True, scope=engineering-demo)
- `mit-gba-nonogram` — MIT GBA Nonogram Advance (eng_ready=True, scope=engineering-demo)
- `mit-gbc-littlegreenblob` — MIT GBC Little Green Blob (eng_ready=True, scope=engineering-demo)
- `mit-gbc-waternet` — MIT GBC Waternet (eng_ready=True, scope=engineering-demo)
- `mit-gb-dot` — MIT GB Dot (eng_ready=True, scope=engineering-demo)
- `mit-genesis-breakout` — MIT Genesis Breakout (eng_ready=True, scope=engineering-demo)
- `mit-genesis-pong` — MIT Genesis Pong (eng_ready=True, scope=engineering-demo)
- `mit-gg-snepzhen` — MIT GG Snepzhen Solitaire (eng_ready=True, scope=engineering-demo)
- `mit-gg-sushinights` — MIT GG Sushi Nights (eng_ready=True, scope=engineering-demo)
- `mit-gg-waternet` — MIT GG Waternet (eng_ready=True, scope=engineering-demo)
- `mit-j2me-dot` — MIT J2ME Dot (eng_ready=True, scope=engineering-demo)
- `mit-j2me-notes` — MIT J2ME Notes (eng_ready=True, scope=engineering-demo)
- `mit-j2me-paddle` — MIT J2ME Paddle (eng_ready=True, scope=engineering-demo)
- `mit-jaguar-2048` — MIT Jaguar 2048 (eng_ready=True, scope=engineering-demo)
- `mit-lynx-dot` — MIT Lynx Dot (eng_ready=True, scope=engineering-demo)
- `mit-msx-dot` — MIT MSX Dot (eng_ready=True, scope=engineering-demo)
- `mit-n64-controller-test` — MIT N64 Controller Test (eng_ready=True, scope=engineering-demo)
- `mit-nds-dinods` — MIT NDS DinoDS (eng_ready=True, scope=engineering-demo)
- `mit-nes-falling` — MIT NES Falling (eng_ready=True, scope=engineering-demo)
- `mit-nes-table-tennis` — MIT NES Table Tennis (eng_ready=True, scope=engineering-demo)
- `mit-ps1-dot` — MIT PS1 Dot (eng_ready=True, scope=engineering-demo)
- `mit-psp-dot` — MIT PSP Dot (eng_ready=True, scope=engineering-demo)
- `mit-sg1000-retropipe` — MIT SG-1000 RetroPIPE (eng_ready=True, scope=engineering-demo)
- `mit-sms-ninjagirl` — MIT SMS Ninja Girl (eng_ready=True, scope=engineering-demo)
- `mit-sms-sushinights` — MIT SMS Sushi Nights (eng_ready=True, scope=engineering-demo)
- `mit-snes-gothicvania` — MIT SNES Gothicvania (eng_ready=True, scope=engineering-demo)
- `mit-vb-spong` — MIT Virtual Boy SPONG (eng_ready=True, scope=engineering-demo)
- `mit-wswan-chips1` — MIT WonderSwan chips1 (eng_ready=True, scope=engineering-demo)
- `mit-zx81-dot` — MIT ZX81 Dot (eng_ready=True, scope=engineering-demo)
- `mit-zx-desolate` — MIT ZX Spectrum Desolate (eng_ready=True, scope=engineering-demo)
- `orbit-catch` — Orbit Catch (eng_ready=True, scope=engineering-demo)
