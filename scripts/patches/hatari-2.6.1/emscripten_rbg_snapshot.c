/*
  Retro Browser Gaming — Emscripten snapshot bridge for Hatari 2.6.1.

  Deferred MemorySnapShot_Capture / MemorySnapShot_Restore (UAE instruction
  boundary). JS drives begin → yield to SDL/ASYNCIFY main loop → poll.
  Do not emscripten_sleep inside ccall: that nested sleep never advances
  m68k_run when invoked from a browser event handler.

  Distributed under the same GPL-2.0 terms as Hatari.
*/
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>

#include "main.h"
#include "memorySnapShot.h"
#include "configuration.h"
#include "tos.h"
#include "emscripten_rbg_snapshot.h"

extern int savestate_state;

#define RBG_SNAP_PATH "/tmp/rbg-hatari.snap"
#define RBG_SNAP_MIN  64

static int rbg_busy;
static int rbg_op; /* 0 idle, 1 save, 2 restore */

static long rbg_file_size(const char *path)
{
	FILE *f = fopen(path, "rb");
	long sz;
	if (!f)
		return -1;
	if (fseek(f, 0, SEEK_END) != 0) {
		fclose(f);
		return -1;
	}
	sz = ftell(f);
	fclose(f);
	return sz;
}

int rbg_hatari_snapshot_save(void)
{
	if (rbg_busy)
		return -1;
	rbg_busy = 1;
	rbg_op = 1;
	unlink(RBG_SNAP_PATH);
	MemorySnapShot_Capture(RBG_SNAP_PATH, false);
	return 0;
}

int rbg_hatari_snapshot_restore(void)
{
	long sz;

	if (rbg_busy)
		return -1;

	sz = rbg_file_size(RBG_SNAP_PATH);
	if (sz < RBG_SNAP_MIN)
		return -3;

	rbg_busy = 1;
	rbg_op = 2;
	MemorySnapShot_Restore(RBG_SNAP_PATH, false);
	return 0;
}

/*
 * Poll deferred op.
 *  0  = still pending
 * >0  = save complete (byte size)
 *  1  = restore complete (also returned as 1)
 * <0  = error (-2 capture/restore error, -4 unexpected idle, -5 busy mismatch)
 */
int rbg_hatari_snapshot_poll(void)
{
	long sz;

	if (!rbg_busy)
		return -4;

	if (MemorySnapShot_LastError()) {
		rbg_busy = 0;
		rbg_op = 0;
		unlink(RBG_SNAP_PATH);
		return -2;
	}

	if (savestate_state != 0)
		return 0;

	if (rbg_op == 1) {
		sz = rbg_file_size(RBG_SNAP_PATH);
		if (sz < RBG_SNAP_MIN)
			return 0; /* file not flushed yet */
		rbg_busy = 0;
		rbg_op = 0;
		return (int)sz;
	}

	if (rbg_op == 2) {
		rbg_busy = 0;
		rbg_op = 0;
		return 1;
	}

	rbg_busy = 0;
	rbg_op = 0;
	return -5;
}

void rbg_hatari_snapshot_cleanup(void)
{
	unlink(RBG_SNAP_PATH);
}

const char *rbg_hatari_snapshot_path(void)
{
	return RBG_SNAP_PATH;
}

int rbg_hatari_snapshot_busy(void)
{
	return rbg_busy ? 1 : 0;
}
