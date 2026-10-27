"use client";
import { useEffect, useRef, useState } from "react";
import {
  LauncherGamepadNav,
  type GamepadPresence,
} from "./launcher-gamepad";

/**
 * Subtle controller presence + launcher focus navigation.
 * Simulated Gamepad API — not physical certification.
 */
export default function GamepadStatus({
  gameplayActive,
}: {
  /** True while an emulator session owns the pad (no overlay). */
  gameplayActive: boolean;
}) {
  const [presence, setPresence] = useState<GamepadPresence>("none");
  const [toast, setToast] = useState<string | null>(null);
  const nav = useRef<LauncherGamepadNav | null>(null);
  const gameplayRef = useRef(gameplayActive);
  gameplayRef.current = gameplayActive;

  useEffect(() => {
    const controller = new LauncherGamepadNav({
      isGameplayActive: () => gameplayRef.current,
      onPresence: (state, detail) => {
        setPresence(state);
        if (detail && (state === "connected" || state === "disconnected")) {
          setToast(detail);
        } else if (state === "unsupported") {
          setToast("Controller navigation unavailable in this browser");
        }
      },
    });
    nav.current = controller;
    return () => {
      controller.dispose();
      nav.current = null;
    };
  }, []);

  useEffect(() => {
    // Entering/leaving gameplay or route changes need a neutral gate.
    nav.current?.requireNeutral();
  }, [gameplayActive]);

  useEffect(() => {
    const onOverlay = () => nav.current?.requireNeutral();
    window.addEventListener("rbg:overlay-open", onOverlay);
    return () => window.removeEventListener("rbg:overlay-open", onOverlay);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const label =
    presence === "unsupported"
      ? "No gamepad API"
      : presence === "connected"
        ? "Controller ready"
        : presence === "disconnected"
          ? "Controller disconnected"
          : "No controller";

  return (
    <>
      <div
        className="gamepad-status"
        data-presence={presence}
        role="status"
        aria-live="polite"
        title="Simulated browser Gamepad API status — physical pads are NOT_VERIFIED"
      >
        <span className="gamepad-status-dot" aria-hidden="true" />
        <span className="gamepad-status-label">{label}</span>
      </div>
      {toast && (
        <div className="gamepad-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}
