/* Retro Browser Gaming — Hatari Emscripten snapshot bridge (GPL-2.0 with Hatari). */
#ifndef EMSCRIPTEN_RBG_SNAPSHOT_H
#define EMSCRIPTEN_RBG_SNAPSHOT_H

int rbg_hatari_snapshot_save(void);
int rbg_hatari_snapshot_restore(void);
int rbg_hatari_snapshot_poll(void);
void rbg_hatari_snapshot_cleanup(void);
const char *rbg_hatari_snapshot_path(void);
int rbg_hatari_snapshot_busy(void);

#endif
