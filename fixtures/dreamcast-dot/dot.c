/* First-party MIT Dreamcast Dot — Retro Browser Gaming engineering fixture.
 *
 * Controllable filled rectangle on a solid backdrop.
 * - D-Pad Left / Right: move horizontally (deterministic start)
 * - Analog stick X: same axis (coarse)
 * - A button: toggle fire color (COLOR2)
 * - Start: exit
 *
 * Built with KallistiOS; no proprietary assets.
 */

#include <kos.h>
#include <dc/maple.h>
#include <dc/maple/controller.h>
#include <dc/video.h>
#include <stdint.h>

KOS_INIT_FLAGS(INIT_DEFAULT);

enum {
  SCREEN_W = 640,
  SCREEN_H = 480,
  DOT_W = 32,
  DOT_H = 32,
  START_X = (SCREEN_W - DOT_W) / 2,
  START_Y = (SCREEN_H - DOT_H) / 2,
  STEP = 4,
};

static uint16_t rgb565(int r, int g, int b) {
  return (uint16_t)(((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3));
}

static void fill_rect(int x0, int y0, int w, int h, uint16_t color) {
  int x1 = x0 + w;
  int y1 = y0 + h;
  if (x0 < 0) x0 = 0;
  if (y0 < 0) y0 = 0;
  if (x1 > SCREEN_W) x1 = SCREEN_W;
  if (y1 > SCREEN_H) y1 = SCREEN_H;
  for (int y = y0; y < y1; y++) {
    uint16_t *row = vram_s + y * SCREEN_W;
    for (int x = x0; x < x1; x++) row[x] = color;
  }
}

static void clear_bg(uint16_t color) {
  for (int i = 0; i < SCREEN_W * SCREEN_H; i++) vram_s[i] = color;
}

int main(int argc, char **argv) {
  (void)argc;
  (void)argv;

  int x = START_X;
  int y = START_Y;
  int fire = 0;
  uint16_t bg = rgb565(16, 24, 48);
  /* DOT_VARIANT=2 (disc 2 / multi-disc fixture): green-tinted idle for
   * machine-verifiable disc identity after swap. Default remains cool grey. */
#if defined(DOT_VARIANT) && (DOT_VARIANT == 2)
  uint16_t idle = rgb565(64, 220, 96);
#else
  uint16_t idle = rgb565(220, 220, 240);
#endif
  uint16_t fired = rgb565(240, 64, 64);

  cont_btn_callback(0, CONT_START, (cont_btn_callback_t)arch_exit);

  clear_bg(bg);
  fill_rect(x, y, DOT_W, DOT_H, idle);

  for (;;) {
    maple_device_t *cont = maple_enum_type(0, MAPLE_FUNC_CONTROLLER);
    int nx = x;
    int ny = y;
    int nfire = fire;

    if (cont) {
      cont_state_t *st = (cont_state_t *)maple_dev_status(cont);
      if (st) {
        if (st->buttons & CONT_DPAD_LEFT) nx -= STEP;
        if (st->buttons & CONT_DPAD_RIGHT) nx += STEP;
        if (st->buttons & CONT_DPAD_UP) ny -= STEP;
        if (st->buttons & CONT_DPAD_DOWN) ny += STEP;
        /* Analog: joyx is signed; threshold avoids drift. */
        if (st->joyx < -64) nx -= STEP;
        if (st->joyx > 64) nx += STEP;
        if (st->joyy < -64) ny -= STEP;
        if (st->joyy > 64) ny += STEP;
        nfire = (st->buttons & CONT_A) ? 1 : 0;
      }
    }

    if (nx < 0) nx = 0;
    if (ny < 0) ny = 0;
    if (nx > SCREEN_W - DOT_W) nx = SCREEN_W - DOT_W;
    if (ny > SCREEN_H - DOT_H) ny = SCREEN_H - DOT_H;

    if (nx != x || ny != y || nfire != fire) {
      fill_rect(x, y, DOT_W, DOT_H, bg);
      x = nx;
      y = ny;
      fire = nfire;
      fill_rect(x, y, DOT_W, DOT_H, fire ? fired : idle);
    }

    thd_sleep(16);
  }

  return 0;
}
