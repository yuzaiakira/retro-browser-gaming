/*
 * Dot — original PSP homebrew fixture for Retro Browser Gaming.
 * Copyright (c) 2026 Retro Browser Gaming contributors
 * SPDX-License-Identifier: MIT
 *
 * Draws a solid green square on a dark blue field. D-pad moves the square
 * by a fixed step each frame so browser tests can assert framebuffer shifts
 * after synthetic controller input. Built with pspdev; no commercial assets.
 */

#include <pspctrl.h>
#include <pspdisplay.h>
#include <pspgu.h>
#include <pspkernel.h>
#include <psptypes.h>

PSP_MODULE_INFO("RBG_DOT", 0, 1, 0);
PSP_MAIN_THREAD_ATTR(PSP_THREAD_ATTR_USER | PSP_THREAD_ATTR_VFPU);

#define BUF_WIDTH 512
#define SCR_WIDTH 480
#define SCR_HEIGHT 272
#define DOT_SIZE 48
#define STEP 8

static unsigned int __attribute__((aligned(16))) list[262144];

struct Vertex {
	unsigned int color;
	short x, y, z;
};

static int exit_request;

static int exit_callback(int arg1, int arg2, void *common) {
	(void)arg1;
	(void)arg2;
	(void)common;
	exit_request = 1;
	return 0;
}

static int callback_thread(SceSize args, void *argp) {
	(void)args;
	(void)argp;
	int cbid = sceKernelCreateCallback("Exit Callback", exit_callback, NULL);
	sceKernelRegisterExitCallback(cbid);
	sceKernelSleepThreadCB();
	return 0;
}

static void setup_callbacks(void) {
	int thid = sceKernelCreateThread("update_thread", callback_thread, 0x11, 0xFA0, 0, 0);
	if (thid >= 0) {
		sceKernelStartThread(thid, 0, 0);
	}
}

static void clamp_dot(int *x, int *y) {
	if (*x < 0) *x = 0;
	if (*y < 0) *y = 0;
	if (*x > SCR_WIDTH - DOT_SIZE) *x = SCR_WIDTH - DOT_SIZE;
	if (*y > SCR_HEIGHT - DOT_SIZE) *y = SCR_HEIGHT - DOT_SIZE;
}

static void draw_rect(int x, int y, int w, int h, unsigned int color) {
	struct Vertex *vertices = (struct Vertex *)sceGuGetMemory(2 * sizeof(struct Vertex));
	vertices[0].color = color;
	vertices[0].x = (short)x;
	vertices[0].y = (short)y;
	vertices[0].z = 0;
	vertices[1].color = color;
	vertices[1].x = (short)(x + w);
	vertices[1].y = (short)(y + h);
	vertices[1].z = 0;
	sceGuDrawArray(GU_SPRITES, GU_COLOR_8888 | GU_VERTEX_16BIT | GU_TRANSFORM_2D, 2, 0, vertices);
}

int main(void) {
	setup_callbacks();

	void *fbp0 = guGetStaticVramBuffer(BUF_WIDTH, SCR_HEIGHT, GU_PSM_8888);
	void *fbp1 = guGetStaticVramBuffer(BUF_WIDTH, SCR_HEIGHT, GU_PSM_8888);

	sceGuInit();
	sceGuStart(GU_DIRECT, list);
	sceGuDrawBuffer(GU_PSM_8888, fbp0, BUF_WIDTH);
	sceGuDispBuffer(SCR_WIDTH, SCR_HEIGHT, fbp1, BUF_WIDTH);
	sceGuOffset(2048 - (SCR_WIDTH / 2), 2048 - (SCR_HEIGHT / 2));
	sceGuViewport(2048, 2048, SCR_WIDTH, SCR_HEIGHT);
	sceGuScissor(0, 0, SCR_WIDTH, SCR_HEIGHT);
	sceGuEnable(GU_SCISSOR_TEST);
	sceGuFinish();
	sceGuSync(0, 0);
	sceDisplayWaitVblankStart();
	sceGuDisplay(GU_TRUE);

	sceCtrlSetSamplingCycle(0);
	sceCtrlSetSamplingMode(PSP_CTRL_MODE_DIGITAL);

	int x = (SCR_WIDTH - DOT_SIZE) / 2;
	int y = (SCR_HEIGHT - DOT_SIZE) / 2;

	while (!exit_request) {
		SceCtrlData pad;
		sceCtrlReadBufferPositive(&pad, 1);
		if (pad.Buttons & PSP_CTRL_LEFT) x -= STEP;
		if (pad.Buttons & PSP_CTRL_RIGHT) x += STEP;
		if (pad.Buttons & PSP_CTRL_UP) y -= STEP;
		if (pad.Buttons & PSP_CTRL_DOWN) y += STEP;
		clamp_dot(&x, &y);

		sceGuStart(GU_DIRECT, list);
		sceGuClearColor(0xff501810);
		sceGuClear(GU_COLOR_BUFFER_BIT);
		draw_rect(x, y, DOT_SIZE, DOT_SIZE, 0xff40ff00);
		sceGuFinish();
		sceGuSync(0, 0);
		sceDisplayWaitVblankStart();
		sceGuSwapBuffers();
	}

	sceGuTerm();
	sceKernelExitGame();
	return 0;
}
