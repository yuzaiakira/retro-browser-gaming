# ADR 001: prove emulation before hardening downloads
Accepted: candidate Sega genesis_plus_gx, PS1 pcsx_rearmed, PSP ppsspp with threads. EmulatorJS v4.2.3 tag resolved to e150dc0491ae747028919fb82d6598954976ede6 on 2026-10-18; candidate only, no executable core package accepted yet.

Official docs confirm core mappings and warn against undocumented internal methods. A versioned adapter and real gameplay tests are mandatory before advertising support. PSP has a hard threads/isolation gate. Large ISO loading remains unproved: no full-file buffer fallback may be advertised as scalable. PS2 is isolated research, disabled by default.

No ROM or BIOS has been accepted for redistribution. A first-party HTML5 game is the permitted fallback, but cannot satisfy Sega/PS1/PSP gates.
Sources: https://emulatorjs.org/docs4devs/cores/ ; https://emulatorjs.org/docs/options/
