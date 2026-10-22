/*
 * Native EightyOne/libretro harness for Retro Browser Gaming ZX81 Dot diagnosis.
 * Loads the same mit-zx81-dot.p used by Chromium 81_eo and records PC/SP/IY,
 * D_FILE, framebuffer lit counts, and input response across frames.
 *
 * Build (from repo root, after building 81_libretro.so):
 *   gcc -O2 -o /tmp/zx81-native-harness scripts/zx81-native-harness.c -ldl
 *   /tmp/zx81-native-harness /path/to/81_libretro.so .fixtures/mit-zx81-dot.p
 */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

/* Minimal libretro API surface matching 81-libretro expectations. */
#define RETRO_API_VERSION 1
#define RETRO_ENVIRONMENT_SET_PIXEL_FORMAT 10
#define RETRO_ENVIRONMENT_GET_LOG_INTERFACE 27
#define RETRO_ENVIRONMENT_GET_VARIABLE 15
#define RETRO_ENVIRONMENT_GET_VARIABLE_UPDATE 17
#define RETRO_ENVIRONMENT_SET_VARIABLES 16
#define RETRO_ENVIRONMENT_SET_CONTROLLER_INFO 35
#define RETRO_ENVIRONMENT_GET_PERF_INTERFACE 28
#define RETRO_ENVIRONMENT_SET_SYSTEM_AV_INFO 37
#define RETRO_PIXEL_FORMAT_RGB565 2
#define RETRO_DEVICE_JOYPAD 1
#define RETRO_DEVICE_ID_JOYPAD_B 0
#define RETRO_DEVICE_ID_JOYPAD_Y 1
#define RETRO_DEVICE_ID_JOYPAD_SELECT 2
#define RETRO_DEVICE_ID_JOYPAD_START 3
#define RETRO_DEVICE_ID_JOYPAD_UP 4
#define RETRO_DEVICE_ID_JOYPAD_DOWN 5
#define RETRO_DEVICE_ID_JOYPAD_LEFT 6
#define RETRO_DEVICE_ID_JOYPAD_RIGHT 7
#define RETRO_DEVICE_ID_JOYPAD_A 8
#define RETRO_DEVICE_ID_JOYPAD_X 9
#define RETRO_LOG_DEBUG 0
#define RETRO_LOG_INFO 1
#define RETRO_LOG_WARN 2
#define RETRO_LOG_ERROR 3

typedef void (*retro_log_printf_t)(int level, const char *fmt, ...);
struct retro_log_callback { retro_log_printf_t log; };
struct retro_variable { const char *key; const char *value; };
struct retro_game_info {
  const char *path;
  const void *data;
  size_t size;
  const char *meta;
};
struct retro_system_info {
  const char *library_name;
  const char *library_version;
  const char *valid_extensions;
  bool need_fullpath;
  bool block_extract;
};
struct retro_game_geometry {
  unsigned base_width, base_height, max_width, max_height;
  float aspect_ratio;
};
struct retro_system_timing { double fps; double sample_rate; };
struct retro_system_av_info {
  struct retro_game_geometry geometry;
  struct retro_system_timing timing;
};

typedef bool (*retro_environment_t)(unsigned cmd, void *data);
typedef void (*retro_video_refresh_t)(const void *data, unsigned width, unsigned height, size_t pitch);
typedef void (*retro_audio_sample_t)(int16_t left, int16_t right);
typedef size_t (*retro_audio_sample_batch_t)(const int16_t *data, size_t frames);
typedef void (*retro_input_poll_t)(void);
typedef int16_t (*retro_input_state_t)(unsigned port, unsigned device, unsigned index, unsigned id);

static uint16_t g_pad = 0;
static uint16_t *g_fb = NULL;
static unsigned g_fb_w, g_fb_h;
static size_t g_fb_pitch;
static unsigned g_frame = 0;
static bool g_var_updated = true;

static void host_log(int level, const char *fmt, ...) {
  (void)level;
  va_list ap;
  va_start(ap, fmt);
  fputs("[core] ", stdout);
  vfprintf(stdout, fmt, ap);
  va_end(ap);
}

static bool env_cb(unsigned cmd, void *data) {
  switch (cmd) {
  case RETRO_ENVIRONMENT_SET_PIXEL_FORMAT: {
    int *fmt = (int *)data;
    return fmt && *fmt == RETRO_PIXEL_FORMAT_RGB565;
  }
  case RETRO_ENVIRONMENT_GET_LOG_INTERFACE: {
    struct retro_log_callback *cb = (struct retro_log_callback *)data;
    cb->log = host_log;
    return true;
  }
  case RETRO_ENVIRONMENT_GET_VARIABLE: {
    struct retro_variable *var = (struct retro_variable *)data;
    if (!var || !var->key) return false;
    /* Match frame.js defaults used in browser. */
    if (!strcmp(var->key, "81_fast_load")) { var->value = "enabled"; return true; }
    if (!strcmp(var->key, "81_chroma_81")) { var->value = "disabled"; return true; }
    if (!strcmp(var->key, "81_joypad_up")) { var->value = "default"; return true; }
    if (!strcmp(var->key, "81_joypad_down")) { var->value = "default"; return true; }
    if (!strcmp(var->key, "81_joypad_left")) { var->value = "default"; return true; }
    if (!strcmp(var->key, "81_joypad_right")) { var->value = "default"; return true; }
    if (!strcmp(var->key, "81_joypad_b")) { var->value = "r"; return true; }
    if (!strcmp(var->key, "81_joypad_a")) { var->value = "p"; return true; }
    if (!strcmp(var->key, "81_joypad_x")) { var->value = "new line"; return true; }
    if (!strcmp(var->key, "81_joypad_y")) { var->value = "shift"; return true; }
    if (!strcmp(var->key, "81_border_size")) { var->value = "normal"; return true; }
    if (!strcmp(var->key, "81_8_16_contents")) { var->value = "auto"; return true; }
    if (!strcmp(var->key, "81_video_presets")) { var->value = "clean"; return true; }
    if (!strcmp(var->key, "81_sound")) { var->value = "none"; return true; }
    if (!strcmp(var->key, "81_highres")) { var->value = "auto"; return true; }
    if (!strcmp(var->key, "81_keybovl_transp")) { var->value = "enabled"; return true; }
    if (!strcmp(var->key, "81_key_hold_time")) { var->value = "100"; return true; }
    var->value = NULL;
    return false;
  }
  case RETRO_ENVIRONMENT_GET_VARIABLE_UPDATE: {
    bool *u = (bool *)data;
    *u = g_var_updated;
    g_var_updated = false;
    return true;
  }
  case RETRO_ENVIRONMENT_SET_VARIABLES:
  case RETRO_ENVIRONMENT_SET_CONTROLLER_INFO:
  case RETRO_ENVIRONMENT_SET_SYSTEM_AV_INFO:
    return true;
  case RETRO_ENVIRONMENT_GET_PERF_INTERFACE:
    return false;
  default:
    return false;
  }
}

static void video_cb(const void *data, unsigned width, unsigned height, size_t pitch) {
  g_fb_w = width;
  g_fb_h = height;
  g_fb_pitch = pitch;
  size_t bytes = pitch * height;
  free(g_fb);
  g_fb = (uint16_t *)malloc(bytes);
  if (g_fb && data) memcpy(g_fb, data, bytes);
  g_frame++;
}

static void audio_cb(int16_t l, int16_t r) { (void)l; (void)r; }
static size_t audio_batch(const int16_t *d, size_t n) { (void)d; return n; }
static void input_poll(void) {}
static int16_t input_state(unsigned port, unsigned device, unsigned index, unsigned id) {
  (void)index;
  if (port > 1 || device != RETRO_DEVICE_JOYPAD) return 0;
  return (g_pad & (1u << id)) ? 1 : 0;
}

static unsigned lit_count(void) {
  if (!g_fb) return 0;
  unsigned lit = 0;
  for (unsigned y = 0; y < g_fb_h; y++) {
    const uint16_t *row = (const uint16_t *)((const uint8_t *)g_fb + y * g_fb_pitch);
    for (unsigned x = 0; x < g_fb_w; x++) {
      uint16_t p = row[x];
      unsigned r = (p >> 11) & 31, g = (p >> 5) & 63, b = p & 31;
      if (r + g + b > 8) lit++;
    }
  }
  return lit;
}

static uint32_t fb_hash(void) {
  if (!g_fb) return 0;
  uint32_t h = 0;
  for (unsigned y = 4; y < g_fb_h; y += 8) {
    const uint16_t *row = (const uint16_t *)((const uint8_t *)g_fb + y * g_fb_pitch);
    for (unsigned x = 4; x < g_fb_w; x += 8)
      h = h * 33u + row[x];
  }
  return h;
}

/* EightyOne snapzx81_t layout from eo.c — first fields only. */
typedef struct {
  uint8_t a, f, b, c, d, e, h, l;
  uint8_t a2, f2, b2, c2, d2, e2, h2, l2;
  uint8_t ixh, ixl, iyh, iyl, sph, spl, pch, pcl;
  uint8_t i, r, im, iff1, iff2, halted;
  uint8_t nmi, hsync, rowch, rowcl;
  uint8_t addr0h, addr0l, addr1h, addr1l;
} snap_hdr_t;

static void dump_snap(const char *label, const void *blob, size_t sz) {
  if (!blob || sz < sizeof(snap_hdr_t)) {
    printf("%s: serialize unavailable (sz=%zu)\n", label, sz);
    return;
  }
  const snap_hdr_t *s = (const snap_hdr_t *)blob;
  unsigned pc = s->pcl | (s->pch << 8);
  unsigned sp = s->spl | (s->sph << 8);
  unsigned iy = s->iyl | (s->iyh << 8);
  unsigned ix = s->ixl | (s->ixh << 8);
  printf("%s: PC=%04X SP=%04X IY=%04X IX=%04X A=%02X halted=%u iff1=%u\n",
         label, pc, sp, iy, ix, s->a, s->halted, s->iff1);

  /* Memory follows header as memory[0..] for zx81.RAMTOP+1 bytes.
     D_FILE is at sysvar $400C (little-endian). */
  const uint8_t *mem = (const uint8_t *)blob + sizeof(snap_hdr_t);
  size_t mem_bytes = sz - sizeof(snap_hdr_t);
  if (mem_bytes > 0x400C + 1) {
    unsigned dfile = mem[0x400C] | (mem[0x400D] << 8);
    unsigned eline = mem[0x4014] | (mem[0x4015] << 8);
    printf("%s: D_FILE=%04X E_LINE=%04X mem[4092]=%02X%02X%02X%02X mem_bytes=%zu\n",
           label, dfile, eline,
           mem_bytes > 0x4095 ? mem[0x4092] : 0,
           mem_bytes > 0x4095 ? mem[0x4093] : 0,
           mem_bytes > 0x4095 ? mem[0x4094] : 0,
           mem_bytes > 0x4095 ? mem[0x4095] : 0,
           mem_bytes);
  }
}

#define LOAD(sym) do { \
  *(void **)(&sym) = dlsym(h, #sym); \
  if (!sym) { fprintf(stderr, "missing %s: %s\n", #sym, dlerror()); return 1; } \
} while (0)

int main(int argc, char **argv) {
  if (argc < 3) {
    fprintf(stderr, "usage: %s 81_libretro.so mit-zx81-dot.p\n", argv[0]);
    return 2;
  }
  void *h = dlopen(argv[1], RTLD_NOW);
  if (!h) { fprintf(stderr, "dlopen: %s\n", dlerror()); return 1; }

  void (*retro_set_environment)(retro_environment_t);
  void (*retro_set_video_refresh)(retro_video_refresh_t);
  void (*retro_set_audio_sample)(retro_audio_sample_t);
  void (*retro_set_audio_sample_batch)(retro_audio_sample_batch_t);
  void (*retro_set_input_poll)(retro_input_poll_t);
  void (*retro_set_input_state)(retro_input_state_t);
  void (*retro_init)(void);
  void (*retro_deinit)(void);
  unsigned (*retro_api_version)(void);
  void (*retro_get_system_info)(struct retro_system_info *);
  void (*retro_get_system_av_info)(struct retro_system_av_info *);
  void (*retro_set_controller_port_device)(unsigned, unsigned);
  bool (*retro_load_game)(const struct retro_game_info *);
  void (*retro_unload_game)(void);
  void (*retro_run)(void);
  void (*retro_reset)(void);
  size_t (*retro_serialize_size)(void);
  bool (*retro_serialize)(void *, size_t);

  LOAD(retro_set_environment);
  LOAD(retro_set_video_refresh);
  LOAD(retro_set_audio_sample);
  LOAD(retro_set_audio_sample_batch);
  LOAD(retro_set_input_poll);
  LOAD(retro_set_input_state);
  LOAD(retro_init);
  LOAD(retro_deinit);
  LOAD(retro_api_version);
  LOAD(retro_get_system_info);
  LOAD(retro_get_system_av_info);
  LOAD(retro_set_controller_port_device);
  LOAD(retro_load_game);
  LOAD(retro_unload_game);
  LOAD(retro_run);
  LOAD(retro_reset);
  LOAD(retro_serialize_size);
  LOAD(retro_serialize);

  printf("api=%u\n", retro_api_version());
  retro_set_environment(env_cb);
  retro_init();
  retro_set_video_refresh(video_cb);
  retro_set_audio_sample(audio_cb);
  retro_set_audio_sample_batch(audio_batch);
  retro_set_input_poll(input_poll);
  retro_set_input_state(input_state);

  struct retro_system_info si;
  memset(&si, 0, sizeof(si));
  retro_get_system_info(&si);
  printf("core=%s %s ext=%s need_fullpath=%d\n",
         si.library_name, si.library_version, si.valid_extensions, (int)si.need_fullpath);

  FILE *f = fopen(argv[2], "rb");
  if (!f) { perror(argv[2]); return 1; }
  fseek(f, 0, SEEK_END);
  long sz = ftell(f);
  rewind(f);
  void *rom = malloc((size_t)sz);
  if (!rom || fread(rom, 1, (size_t)sz, f) != (size_t)sz) {
    fprintf(stderr, "read failed\n");
    return 1;
  }
  fclose(f);
  printf("loaded fixture %ld bytes sha_head=%02X%02X%02X%02X\n",
         sz, ((uint8_t *)rom)[0], ((uint8_t *)rom)[1], ((uint8_t *)rom)[2], ((uint8_t *)rom)[3]);

  struct retro_game_info gi = {
    .path = argv[2],
    .data = rom,
    .size = (size_t)sz,
    .meta = NULL,
  };
  if (!retro_load_game(&gi)) {
    fprintf(stderr, "retro_load_game failed\n");
    return 1;
  }
  retro_set_controller_port_device(0, RETRO_DEVICE_JOYPAD);
  retro_set_controller_port_device(1, RETRO_DEVICE_JOYPAD);

  size_t ssz = retro_serialize_size();
  void *snap = malloc(ssz);
  printf("serialize_size=%zu\n", ssz);

  /* Phase 1: boot frames with no input */
  g_pad = 0;
  for (int i = 0; i < 100; i++) retro_run();
  retro_serialize(snap, ssz);
  dump_snap("after_100_frames", snap, ssz);
  unsigned lit0 = lit_count();
  uint32_t h0 = fb_hash();
  printf("fb: %ux%u lit=%u hash=%u frames=%u\n", g_fb_w, g_fb_h, lit0, h0, g_frame);

  /* Phase 2: hold Left (maps to ZX81 '5') for 50 frames */
  g_pad = (1u << RETRO_DEVICE_ID_JOYPAD_LEFT);
  for (int i = 0; i < 50; i++) retro_run();
  retro_serialize(snap, ssz);
  dump_snap("after_left_hold", snap, ssz);
  unsigned lit1 = lit_count();
  uint32_t h1 = fb_hash();
  printf("fb_after_left: lit=%u hash=%u delta_hash=%d\n", lit1, h1, (int)(h1 != h0));

  /* Phase 3: B (RUN/'r') then X (newline) then Left again */
  g_pad = (1u << RETRO_DEVICE_ID_JOYPAD_B);
  for (int i = 0; i < 10; i++) retro_run();
  g_pad = 0;
  for (int i = 0; i < 5; i++) retro_run();
  g_pad = (1u << RETRO_DEVICE_ID_JOYPAD_X);
  for (int i = 0; i < 10; i++) retro_run();
  g_pad = 0;
  for (int i = 0; i < 30; i++) retro_run();
  retro_serialize(snap, ssz);
  dump_snap("after_run_keys", snap, ssz);
  uint32_t h2 = fb_hash();
  printf("fb_after_run: lit=%u hash=%u changed_from_boot=%d\n", lit_count(), h2, (int)(h2 != h0));

  g_pad = (1u << RETRO_DEVICE_ID_JOYPAD_LEFT);
  for (int i = 0; i < 60; i++) retro_run();
  g_pad = 0;
  for (int i = 0; i < 10; i++) retro_run();
  retro_serialize(snap, ssz);
  dump_snap("after_post_run_left", snap, ssz);
  uint32_t h3 = fb_hash();
  printf("fb_post_run_left: lit=%u hash=%u changed_from_run=%d\n", lit_count(), h3, (int)(h3 != h2));

  printf("\nVERDICT: input_changed=%s boot_pc_in_crt=%s\n",
         (h3 != h0 || h1 != h0 || h2 != h0) ? "YES" : "NO",
         "see dumps");

  retro_unload_game();
  retro_deinit();
  free(snap);
  free(rom);
  free(g_fb);
  dlclose(h);
  return 0;
}
