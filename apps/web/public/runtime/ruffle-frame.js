/**
 * Isolated Ruffle (Flash) runtime bridge — postMessage protocol aligned with frame.js.
 * Untrusted SWF: no ExternalInterface, allowNetworking=none, CSP connect-src 'self'.
 * saveState is false — SharedObject / first-party progress only (not libretro states).
 */
/* global RufflePlayer */
let session = null;
let started = false;
let player = null;
let ruffleApi = null;
let shellCodes = new Set(["Escape", "KeyP", "KeyF", "F8", "F9"]);
let disposed = false;
let keyState = { left: false, right: false, fire: false };
const MAX_SWF_BYTES = 16 * 1024 * 1024;

const reply = (data) => parent.postMessage({ ...data, session }, location.origin);

function editableTarget(t) {
  if (!t || typeof t.closest !== "function") return false;
  if (t.isContentEditable) return true;
  return !!t.closest('input,select,textarea,[contenteditable="true"]');
}

addEventListener(
  "keydown",
  (e) => {
    if (!session || disposed) return;
    if (editableTarget(e.target)) return;
    if (!(shellCodes.has(e.code) || e.key === "Escape")) return;
    if (e.code === "F5") return;
    e.preventDefault();
    e.stopPropagation();
    reply({
      type: "shell-key",
      code: e.code,
      key: e.key,
      ctrlKey: !!e.ctrlKey,
      altKey: !!e.altKey,
      metaKey: !!e.metaKey,
      shiftKey: !!e.shiftKey,
      repeat: !!e.repeat,
      isComposing: !!e.isComposing,
    });
  },
  true,
);

function assertSafeSwfName(name) {
  const n = String(name || "game.swf").replace(/\\/g, "/");
  if (!n || n.includes("\0") || n.startsWith("/") || n.includes("..")) {
    throw new Error("SWF_BAD_NAME");
  }
  if (!/\.swf$/i.test(n)) throw new Error("SWF_EXTENSION_REQUIRED");
  return n.split("/").pop();
}

function keyPayload(code, down) {
  const key =
    code === "ArrowLeft"
      ? "ArrowLeft"
      : code === "ArrowRight"
        ? "ArrowRight"
        : code === "Space"
          ? " "
          : code === "KeyR"
            ? "r"
            : code;
  const keyCode =
    code === "ArrowLeft"
      ? 37
      : code === "ArrowRight"
        ? 39
        : code === "Space"
          ? 32
          : code === "KeyR"
            ? 82
            : 0;
  return {
    code,
    key,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
}

function dispatchKeyToPlayer(code, down) {
  if (!player) return;
  const type = down ? "keydown" : "keyup";
  const init = keyPayload(code, down);
  try {
    player.focus?.();
  } catch {
    /* ignore */
  }
  const targets = [player, document, window];
  try {
    const root = player.shadowRoot;
    if (root) {
      const canvas = root.querySelector("canvas");
      if (canvas) targets.unshift(canvas);
      targets.unshift(root);
    }
  } catch {
    /* ignore */
  }
  for (const t of targets) {
    try {
      t.dispatchEvent?.(new KeyboardEvent(type, init));
    } catch {
      /* ignore */
    }
  }
}

function mapLibretroInput(command, value) {
  // Libretro RetroPad (matches apps/web/src/features/input.ts):
  // 6=Left 7=Right 0=B 8=A 3=Start
  const down = value === 1;
  if (command === 6) {
    if (keyState.left === down) return;
    keyState.left = down;
    dispatchKeyToPlayer("ArrowLeft", down);
  } else if (command === 7) {
    if (keyState.right === down) return;
    keyState.right = down;
    dispatchKeyToPlayer("ArrowRight", down);
  } else if (command === 0 || command === 8 || command === 3) {
    if (keyState.fire === down) return;
    keyState.fire = down;
    dispatchKeyToPlayer("Space", down);
  }
}

function destroyPlayer() {
  try {
    if (ruffleApi && typeof ruffleApi.destroy === "function") ruffleApi.destroy();
  } catch {
    /* ignore */
  }
  try {
    player?.remove?.();
  } catch {
    /* ignore */
  }
  player = null;
  ruffleApi = null;
  started = false;
}

async function bootSwf(file, name) {
  if (disposed) throw new Error("Runtime disposed");
  destroyPlayer();
  const swfName = assertSafeSwfName(name || file?.name || "game.swf");
  if (!(file instanceof Blob)) throw new Error("SWF_MISSING");
  if (file.size <= 0) throw new Error("SWF_EMPTY");
  if (file.size > MAX_SWF_BYTES) throw new Error("SWF_TOO_LARGE");

  const bytes = new Uint8Array(await file.arrayBuffer());
  // SWF magic: FWS / CWS / ZWS
  const b0 = bytes[0];
  const b1 = bytes[1];
  const b2 = bytes[2];
  if (!(b1 === 0x57 && b2 === 0x53 && (b0 === 0x46 || b0 === 0x43 || b0 === 0x5a))) {
    throw new Error("SWF_INVALID_HEADER");
  }

  if (!window.RufflePlayer || typeof window.RufflePlayer.newest !== "function") {
    throw new Error("RUFFLE_MISSING");
  }
  const source = window.RufflePlayer.newest();
  player = source.createPlayer();
  player.id = "ruffle-player";
  player.style.width = "100%";
  player.style.height = "100%";
  const container = document.getElementById("container");
  container.replaceChildren(player);
  ruffleApi = player.ruffle();

  await ruffleApi.load({
    data: bytes,
    swfFileName: swfName,
    allowScriptAccess: false,
    allowNetworking: "none",
    autoplay: "on",
    unmuteOverlay: "hidden",
    letterbox: "on",
    contextMenu: "off",
  });

  started = true;
  reply({
    type: "ready",
    capabilities: {
      saveState: false,
      audio: true,
      analog: false,
      seekableMedia: false,
      onDemandMedia: false,
      progressPersistence: "shared-object",
      ruffleRuntime: "ruffle-0.7.1",
      externalInterface: false,
    },
  });
}

addEventListener("message", async (event) => {
  if (disposed) return;
  if (event.source !== parent || event.origin !== location.origin) return;
  const d = event.data;
  if (!d || typeof d !== "object") return;

  if (d.type === "init" && !session) {
    session = d.session;
    try {
      await bootSwf(d.file, d.name);
    } catch (error) {
      reply({ type: "error", error: String(error?.message || error) });
    }
    return;
  }
  if (d.session !== session) return;

  if (d.type === "command" && d.method === "setShellKeys") {
    const list = Array.isArray(d.value) ? d.value : [];
    shellCodes = new Set(
      list.filter((c) => typeof c === "string" && c.length > 0 && c.length <= 40),
    );
    reply({ type: "reply", id: d.id, value: true });
    return;
  }

  if (d.type === "input") {
    mapLibretroInput(d.command, d.value);
    return;
  }

  if (d.type !== "command") return;
  try {
    let value = null;
    switch (d.method) {
      case "start":
      case "resume":
        ruffleApi?.resume?.();
        break;
      case "pause":
        ruffleApi?.suspend?.();
        break;
      case "reset":
        // Soft reset: re-dispatch KeyR to first-party fixture; generic SWFs may ignore.
        dispatchKeyToPlayer("KeyR", true);
        dispatchKeyToPlayer("KeyR", false);
        ruffleApi?.resume?.();
        break;
      case "volume": {
        const v = Number(d.value);
        if (ruffleApi && Number.isFinite(v)) {
          ruffleApi.volume = Math.max(0, Math.min(1, v));
        }
        break;
      }
      case "save":
        throw new Error("Save states unsupported");
      case "load":
        throw new Error("Save states unsupported");
      case "seekableStats":
        value = null;
        break;
      case "dispose":
        destroyPlayer();
        disposed = true;
        break;
      default:
        throw new Error("UNSUPPORTED_OPERATION");
    }
    reply({ type: "reply", id: d.id, value });
  } catch (error) {
    reply({ type: "reply", id: d.id, error: String(error?.message || error) });
  }
});

addEventListener("pagehide", () => {
  destroyPlayer();
  disposed = true;
});
