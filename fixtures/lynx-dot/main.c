/* SPDX-License-Identifier: MIT
 * First-party Retro Browser Gaming Lynx smoke fixture.
 * Draws a white panel and moves a black square with the joypad.
 */
#include <lynx.h>
#include <tgi.h>
#include <joystick.h>

void main(void) {
  unsigned char x = 60;
  unsigned char y = 40;
  unsigned char joy;
  tgi_install(tgi_static_stddrv);
  tgi_init();
  while (tgi_busy()) {}
  joy_install(joy_static_stddrv);
  tgi_clear();
  tgi_setcolor(TGI_COLOR_WHITE);
  tgi_bar(0, 0, 159, 101);
  tgi_setcolor(TGI_COLOR_BLACK);
  tgi_bar(x, y, (unsigned char)(x + 12), (unsigned char)(y + 12));
  tgi_updatedisplay();
  while (1) {
    joy = joy_read(JOY_1);
    if (JOY_LEFT(joy) && x > 2) x -= 2;
    if (JOY_RIGHT(joy) && x < 140) x += 2;
    if (JOY_UP(joy) && y > 2) y -= 2;
    if (JOY_DOWN(joy) && y < 85) y += 2;
    tgi_setcolor(TGI_COLOR_WHITE);
    tgi_bar(0, 0, 159, 101);
    tgi_setcolor(TGI_COLOR_BLACK);
    tgi_bar(x, y, (unsigned char)(x + 12), (unsigned char)(y + 12));
    tgi_updatedisplay();
  }
}
