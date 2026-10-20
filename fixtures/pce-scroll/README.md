# huc-pce-scroll (PC Engine HuCard)

HuC example `examples/scroll/scroll.c` from BlockoS/huc (GPL-2.0).

Build (requires HuC toolchain):

```bash
export PCE_INCLUDE=/path/to/huc/include/pce
export PCE_PCEAS=/path/to/huc/bin/pceas
/path/to/huc/bin/huc -fno-recursive -msmall scroll.c
```

Tracked ROM: `.fixtures/huc-pce-scroll.pce` — GPL-2.0, see `LICENSES/HuC-GPL-2.0.txt`.
