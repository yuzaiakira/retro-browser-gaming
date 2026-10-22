/*
 * MIT MSX Dot — first-party engineering fixture for Retro Browser Gaming.
 * Cursor keys / joystick move a character; fire flashes the glyph.
 * Built with: zcc +msx -subtype=rom -create-app -O2 -o mit-msx-dot dot.c
 */
#include <stdio.h>
#include <conio.h>
#include <games.h>

static unsigned char x = 16;
static unsigned char y = 12;

static void put_dot(char ch)
{
    gotoxy(x, y);
    putch(ch);
}

int main(void)
{
    unsigned int joy;
    unsigned char flash = 0;

    clrscr();
    put_dot('O');

    for (;;) {
        /* 1 = cursors/keyboard; 2 = joystick port A */
        joy = joystick(1);
        if (!joy)
            joy = joystick(2);

        if (!joy)
            continue;

        put_dot(' ');

        if (joy & MOVE_UP) {
            if (y > 0)
                --y;
        }
        if (joy & MOVE_DOWN) {
            if (y < 23)
                ++y;
        }
        if (joy & MOVE_LEFT) {
            if (x > 0)
                --x;
        }
        if (joy & MOVE_RIGHT) {
            if (x < 31)
                ++x;
        }
        if (joy & MOVE_FIRE)
            flash ^= 1;

        put_dot(flash ? '*' : 'O');

        /* Simple hold delay so Chromium input samples show a clear delta */
        {
            unsigned int i;
            for (i = 0; i < 1200; ++i)
                ;
        }
    }
    return 0;
}
