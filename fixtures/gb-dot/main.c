/* First-party MIT Game Boy DMG fixture — visible playfield + movable sprite. */
#include <gb/gb.h>
#include <stdint.h>

const unsigned char tile[] = {
  0xFF,0xFF,0x81,0x81,0x81,0x81,0x81,0x81,
  0x81,0x81,0x81,0x81,0x81,0x81,0xFF,0xFF
};
const unsigned char sprite_tile[] = {
  0x3C,0x3C,0x7E,0x7E,0xFF,0xFF,0xFF,0xFF,
  0xFF,0xFF,0xFF,0xFF,0x7E,0x7E,0x3C,0x3C
};
unsigned char map[360];

void main(void) {
  uint8_t x = 80;
  uint8_t y = 72;
  uint16_t i;
  for (i = 0; i < 360; i++) map[i] = 1;
  set_bkg_data(1, 1, tile);
  set_bkg_tiles(0, 0, 20, 18, map);
  set_sprite_data(0, 1, sprite_tile);
  set_sprite_tile(0, 0);
  move_sprite(0, x, y);
  SHOW_BKG;
  SHOW_SPRITES;
  DISPLAY_ON;
  BGP_REG = 0xE4U;
  OBP0_REG = 0xE4U;
  while (1) {
    uint8_t joy = joypad();
    if ((joy & J_LEFT) && x > 8) x -= 2;
    if ((joy & J_RIGHT) && x < 160) x += 2;
    if ((joy & J_UP) && y > 16) y -= 2;
    if ((joy & J_DOWN) && y < 152) y += 2;
    move_sprite(0, x, y);
    wait_vbl_done();
  }
}
