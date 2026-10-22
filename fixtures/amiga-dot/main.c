/*
 * Amiga Dot — first-party MIT joystick fixture for Retro Browser Gaming.
 *
 * Boots under PUAE with AROS Kickstart fallback (no proprietary Kickstart).
 * Moves a bright block with the joystick in Amiga port 2; fire toggles color.
 * All art/logic is original; no commercial ROM or asset dependencies.
 */

#include <proto/exec.h>
#include <proto/dos.h>
#include <proto/graphics.h>
#include <proto/intuition.h>
#include <hardware/custom.h>
#include <hardware/cia.h>
#include <graphics/gfxbase.h>
#include <intuition/screens.h>
#include <intuition/intuition.h>

extern struct Custom custom;
extern volatile struct CIA ciaa;
/* IntuitionBase / GfxBase come from proto/*.h */

#define W 320
#define H 200
#define BOX 16

static struct Screen *screen;
static struct Window *window;
static struct RastPort *rp;

static WORD x = (W - BOX) / 2;
static WORD y = (H - BOX) / 2;
static UWORD color = 2;
static UWORD prev_fire;

/* Decode Amiga joystick port 2 (JOY1DAT). Returns dx,dy in -1..1 and fire. */
static void read_joy2(WORD *dx, WORD *dy, UWORD *fire) {
  UWORD jd = custom.joy1dat;
  WORD raw_x = (jd >> 1) ^ jd;
  *dx = 0;
  *dy = 0;
  if (raw_x & 1)
    *dx = 1;
  if (raw_x & 2)
    *dx = -1;
  if (jd & 1)
    *dy = 1;
  if (jd & 2)
    *dy = -1;
  /* Fire button on port 2 is CIA-A bit 7 (active low). */
  *fire = (ciaa.ciapra & CIAF_GAMEPORT1) ? 0 : 1;
}

static void draw_box(WORD px, WORD py, UWORD pen) {
  SetAPen(rp, pen);
  RectFill(rp, px, py, px + BOX - 1, py + BOX - 1);
}

static BOOL open_display(void) {
  IntuitionBase = (struct IntuitionBase *)OpenLibrary("intuition.library", 37);
  GfxBase = (struct GfxBase *)OpenLibrary("graphics.library", 37);
  if (!IntuitionBase || !GfxBase)
    return FALSE;

  screen = OpenScreenTags(
      NULL, SA_Width, W, SA_Height, H, SA_Depth, 3, SA_Title, (ULONG) "Amiga Dot",
      SA_Type, CUSTOMSCREEN, SA_DisplayID, LORES_KEY, TAG_DONE);
  if (!screen)
    return FALSE;

  window = OpenWindowTags(
      NULL, WA_CustomScreen, (ULONG)screen, WA_Left, 0, WA_Top, 0, WA_Width, W,
      WA_Height, H, WA_Flags, WFLG_BORDERLESS | WFLG_ACTIVATE | WFLG_RMBTRAP,
      WA_IDCMP, 0, TAG_DONE);
  if (!window)
    return FALSE;

  rp = window->RPort;
  SetRast(rp, 1); /* dark blue background */
  draw_box(x, y, color);
  return TRUE;
}

static void close_display(void) {
  if (window)
    CloseWindow(window);
  if (screen)
    CloseScreen(screen);
  if (GfxBase)
    CloseLibrary((struct Library *)GfxBase);
  if (IntuitionBase)
    CloseLibrary((struct Library *)IntuitionBase);
}

int main(void) {
  WORD dx, dy;
  UWORD fire;
  ULONG frames = 0;

  if (!open_display()) {
    PutStr("Amiga Dot: failed to open display\n");
    return 20;
  }

  /* ~10 seconds of interactive play loop (50Hz-ish Delay). */
  while (frames < 50 * 600) {
    read_joy2(&dx, &dy, &fire);
    if (dx || dy || (fire && !prev_fire)) {
      draw_box(x, y, 1);
      x += dx * 4;
      y += dy * 4;
      if (x < 0)
        x = 0;
      if (y < 0)
        y = 0;
      if (x > W - BOX)
        x = W - BOX;
      if (y > H - BOX)
        y = H - BOX;
      if (fire && !prev_fire) {
        color++;
        if (color > 7)
          color = 2;
      }
      draw_box(x, y, color);
    }
    prev_fire = fire;
    Delay(1); /* 1/50s tick */
    frames++;
  }

  close_display();
  return 0;
}
