# First-party Amiga Dot build (m68k-amigaos-gcc via amigadev/crosstools).
CC = m68k-amigaos-gcc
CFLAGS = -Os -Wall -fomit-frame-pointer -noixemul
LDFLAGS = -noixemul -s

all: AmigaDot

AmigaDot: main.c
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

clean:
	rm -f AmigaDot
