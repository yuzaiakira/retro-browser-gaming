/*
 * Dot — original PS1 homebrew fixture for Retro Browser Gaming.
 * Copyright (c) 2026 Retro Browser Gaming contributors
 * SPDX-License-Identifier: MIT
 *
 * Draws a solid green square on a dark blue field. D-pad moves the square
 * by a fixed step each frame so browser tests can assert framebuffer shifts
 * after synthetic controller input. Built with PSn00bSDK; no commercial assets.
 */

#include <stdint.h>
#include <stdio.h>
#include <psxapi.h>
#include <psxgpu.h>
#include <psxpad.h>

#define OT_LENGTH 16
#define BUFFER_LENGTH 8192
#define SCREEN_XRES 320
#define SCREEN_YRES 240
#define DOT_SIZE 48
#define STEP 8

typedef struct {
	DISPENV disp_env;
	DRAWENV draw_env;
	uint32_t ot[OT_LENGTH];
	uint8_t buffer[BUFFER_LENGTH];
} RenderBuffer;

typedef struct {
	RenderBuffer buffers[2];
	uint8_t *next_packet;
	int active_buffer;
} RenderContext;

static volatile uint8_t pad_buff[2][34];

static void setup_context(RenderContext *ctx) {
	SetDefDrawEnv(&(ctx->buffers[0].draw_env), 0, 0, SCREEN_XRES, SCREEN_YRES);
	SetDefDispEnv(&(ctx->buffers[0].disp_env), 0, 0, SCREEN_XRES, SCREEN_YRES);
	SetDefDrawEnv(&(ctx->buffers[1].draw_env), 0, SCREEN_YRES, SCREEN_XRES, SCREEN_YRES);
	SetDefDispEnv(&(ctx->buffers[1].disp_env), 0, SCREEN_YRES, SCREEN_XRES, SCREEN_YRES);

	setRGB0(&(ctx->buffers[0].draw_env), 16, 24, 80);
	setRGB0(&(ctx->buffers[1].draw_env), 16, 24, 80);
	ctx->buffers[0].draw_env.isbg = 1;
	ctx->buffers[1].draw_env.isbg = 1;

	ctx->active_buffer = 0;
	ctx->next_packet = ctx->buffers[0].buffer;
	ClearOTagR(ctx->buffers[0].ot, OT_LENGTH);
	SetDispMask(1);
}

static void flip_buffers(RenderContext *ctx) {
	DrawSync(0);
	VSync(0);

	RenderBuffer *draw_buffer = &(ctx->buffers[ctx->active_buffer]);
	RenderBuffer *disp_buffer = &(ctx->buffers[ctx->active_buffer ^ 1]);

	PutDispEnv(&(disp_buffer->disp_env));
	DrawOTagEnv(&(draw_buffer->ot[OT_LENGTH - 1]), &(draw_buffer->draw_env));

	ctx->active_buffer ^= 1;
	ctx->next_packet = disp_buffer->buffer;
	ClearOTagR(disp_buffer->ot, OT_LENGTH);
}

static void *new_primitive(RenderContext *ctx, int z, size_t size) {
	RenderBuffer *buffer = &(ctx->buffers[ctx->active_buffer]);
	uint8_t *prim = ctx->next_packet;
	addPrim(&(buffer->ot[z]), prim);
	ctx->next_packet += size;
	return (void *)prim;
}

static void draw_text(RenderContext *ctx, int x, int y, int z, const char *text) {
	RenderBuffer *buffer = &(ctx->buffers[ctx->active_buffer]);
	ctx->next_packet = (uint8_t *)FntSort(&(buffer->ot[z]), ctx->next_packet, x, y, text);
}

static void clamp_dot(int *x, int *y) {
	if (*x < 0) *x = 0;
	if (*y < 0) *y = 0;
	if (*x > SCREEN_XRES - DOT_SIZE) *x = SCREEN_XRES - DOT_SIZE;
	if (*y > SCREEN_YRES - DOT_SIZE) *y = SCREEN_YRES - DOT_SIZE;
}

int main(int argc, const char **argv) {
	(void)argc;
	(void)argv;

	ResetGraph(0);
	FntLoad(960, 0);

	InitPAD((uint8_t *)pad_buff[0], 34, (uint8_t *)pad_buff[1], 34);
	StartPAD();
	ChangeClearPAD(0);

	RenderContext ctx;
	setup_context(&ctx);

	int x = (SCREEN_XRES - DOT_SIZE) / 2;
	int y = (SCREEN_YRES - DOT_SIZE) / 2;

	for (;;) {
		PADTYPE *pad = (PADTYPE *)pad_buff[0];
		if (pad->stat == 0) {
			if (!(pad->btn & PAD_LEFT)) x -= STEP;
			if (!(pad->btn & PAD_RIGHT)) x += STEP;
			if (!(pad->btn & PAD_UP)) y -= STEP;
			if (!(pad->btn & PAD_DOWN)) y += STEP;
			clamp_dot(&x, &y);
		}

		TILE *tile = (TILE *)new_primitive(&ctx, 1, sizeof(TILE));
		setTile(tile);
		setXY0(tile, x, y);
		setWH(tile, DOT_SIZE, DOT_SIZE);
		setRGB0(tile, 0, 255, 64);

		char line[48];
		sprintf(line, "DOT x=%d y=%d", x, y);
		draw_text(&ctx, 8, 8, 0, line);
		draw_text(&ctx, 8, 24, 0, "D-pad moves the green square");

		flip_buffers(&ctx);
	}

	return 0;
}
