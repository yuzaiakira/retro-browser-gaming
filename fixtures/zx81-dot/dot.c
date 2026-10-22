/*
 * MIT ZX81 Dot — first-party engineering fixture for Retro Browser Gaming.
 * Cursor keys 5/6/7/8 (ZX81) and O/P/Q/A move a character; Space flashes.
 */
#include <stdio.h>
#include <zx81.h>

static unsigned char x = 15;
static unsigned char y = 11;

static void put_dot(unsigned char ch)
{
    zx_setcursorpos(y, x);
    putchar(ch);
}

int main(void)
{
    unsigned char k;

    zx_cls();
    put_dot('O');

    for (;;) {
        k = getk();
        if (!k)
            continue;

        put_dot(' ');

        if (k == '5' || k == 'o' || k == 'O') {
            if (x > 0)
                --x;
        } else if (k == '8' || k == 'p' || k == 'P') {
            if (x < 31)
                ++x;
        } else if (k == '7' || k == 'q' || k == 'Q') {
            if (y > 0)
                --y;
        } else if (k == '6' || k == 'a' || k == 'A') {
            if (y < 21)
                ++y;
        }

        put_dot('O');
    }
    return 0;
}
