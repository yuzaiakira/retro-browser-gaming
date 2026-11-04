# Dreamful

An English diskmag for the Famicom Disk System (FDS).

Written by TakuikaNinja.

## License

This software is noncommercial shareware. You are free to redistribute this software at no cost, under the following conditions:
- No financial gains are made during redistribution.
- The disk image contents are left intact.
- The contents of this README file are left intact and paired with the disk image whenever possible.
- The author of this software is clearly attributed to TakuikaNinja, preferably with a link to its origin.

## Overview

Dreamful is (probably) the first English diskmag for the FDS. This issue celebrates the 40th anniversary of the Famicom addon (1986-02-21).

The name "Dreamful" was chosen as a reference to the slogan for the FDS: 夢いっぱいディスク (dream-filled/dreamful disk)

### Contents

- A primer on the state of FDS R&D in 2026
- Disk BASIC
- Namco IPL
- I2 Souseiki Fammy
- Battle Battle League prototype
- Review of Ravi and Navi
- Utility to unlock glitched worlds (256W) in FDS SMB1
- Credits and greets

## Building

The source code is available at: https://github.com/TakuikaNinja/FDS-diskmag

Dependencies:
- [CC65 suite](https://cc65.github.io/), make
- gcc (DTE compressor, see `Screens/dte.c`)
- go (VRAM struct compressor, see `Screens/vramstruct.go`)
- [NEXXT](https://frankengraphics.itch.io/nexxt) (screen editor, only required for intro screen)

A simple `make` should then work.

## Acknowledgements

- `Jroatch-chr-sheet.chr` was converted from the following placeholder CHR sheet: https://www.nesdev.org/wiki/File:Jroatch-chr-sheet.chr.png
  - It contains tiles from Generitiles by Drag, Cavewoman by Sik, and Chase by shiru.
- CutterCross' [Sabre](https://github.com/CutterCross/Sabre) sound engine was used.
- Emulator testing was done using [Mesen2](https://www.mesen.ca/).
- Hardware testing was done using a Sharp Twin Famicom + [FDSKey](https://github.com/ClusterM/fdskey).
- The NESdev Wiki, Forums, and Discord have been a massive help. Kudos to everyone keeping this console generation alive!

