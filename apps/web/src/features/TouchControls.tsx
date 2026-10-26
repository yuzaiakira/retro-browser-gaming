"use client";
import { useEffect, useRef, useState } from "react";
import { setting, setSetting } from "@/lib/db";
import { commands, type InputRouter } from "./input";

type Button = {
  name: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
};

const LAYOUT_SCHEMA = 2;

const defaults: Button[] = [
  ["Up", 17, 25],
  ["Left", 7, 48],
  ["Down", 17, 70],
  ["Right", 27, 48],
  ["A", 91, 48],
  ["B", 80, 70],
  ["X", 80, 25],
  ["Y", 69, 48],
  ["Start", 55, 80],
  ["Select", 44, 80],
  ["L", 8, 7],
  ["R", 92, 7],
].map(([name, x, y]) => ({
  name: String(name),
  x: Number(x),
  y: Number(y),
  size: 52,
  opacity: 0.72,
}));

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLayout(raw: unknown): Button[] {
  if (!Array.isArray(raw) || !raw.length) return defaults.map((b) => ({ ...b }));
  const byName = new Map(
    raw
      .filter((b): b is Button => !!b && typeof b === "object" && "name" in b)
      .map((b) => [String((b as Button).name), b as Button]),
  );
  return defaults.map((d) => {
    const hit = byName.get(d.name);
    if (!hit) return { ...d };
    return {
      name: d.name,
      x: clamp(Number(hit.x ?? d.x), 5, 95),
      y: clamp(Number(hit.y ?? d.y), 6, 94),
      size: clamp(Number(hit.size ?? d.size), 36, 84),
      opacity: clamp(Number(hit.opacity ?? d.opacity), 0.25, 1),
    };
  });
}

export default function TouchControls({
  router,
  system,
  edit,
  analog,
  overlay = false,
  onEditCancel,
}: {
  router: InputRouter | null;
  system: string;
  edit: boolean;
  analog: boolean;
  /** When true, fill the player stage instead of a separate strip. */
  overlay?: boolean;
  onEditCancel?: () => void;
}) {
  const [orientation, setOrientation] = useState("landscape");
  const [layout, setLayout] = useState(defaults);
  const [draft, setDraft] = useState<Button[] | null>(null);
  const [selected, setSelected] = useState("A");
  const [dirty, setDirty] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const key = `layout:v${LAYOUT_SCHEMA}:${system}:${orientation}`;
  const legacyKey = `layout:${system}:${orientation}`;
  const active = draft ?? layout;
  const current = active.find((b) => b.name === selected) ?? active[0];

  useEffect(() => {
    const update = () =>
      setOrientation(innerWidth > innerHeight ? "landscape" : "portrait");
    update();
    addEventListener("resize", update);
    addEventListener("orientationchange", update);
    return () => {
      removeEventListener("resize", update);
      removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const modern = await setting<Button[] | null>(key, null as unknown as Button[]);
      if (cancelled) return;
      if (modern && Array.isArray(modern) && modern.length) {
        setLayout(normalizeLayout(modern));
        return;
      }
      const legacy = await setting<Button[]>(legacyKey, defaults);
      if (cancelled) return;
      const migrated = normalizeLayout(legacy);
      setLayout(migrated);
      await setSetting(key, migrated);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, legacyKey]);

  useEffect(() => {
    if (edit) {
      setDraft(layout.map((b) => ({ ...b })));
      setDirty(false);
    } else {
      setDraft(null);
      setDirty(false);
    }
  }, [edit, layout]);

  const change = (name: string, patch: Partial<Button>) => {
    setDraft((old) => {
      const base = old ?? layout;
      return base.map((b) => (b.name === name ? { ...b, ...patch } : b));
    });
    setDirty(true);
  };

  async function saveLayout() {
    if (!draft) return;
    const next = normalizeLayout(draft);
    setLayout(next);
    await setSetting(key, next);
    setDraft(null);
    setDirty(false);
  }

  function cancelEdit() {
    setDraft(null);
    setDirty(false);
    onEditCancel?.();
  }

  return (
    <>
      {overlay &&
        orientation === "portrait" &&
        !edit && (
          <p className="orientation-hint" role="status">
            Rotate to landscape for more control space when you can — portrait
            still works.
          </p>
        )}
      <div
        className={
          "touch-area " +
          (overlay ? "touch-overlay " : "") +
          (edit ? "editing" : "")
        }
        ref={area}
      >
        {active.map((button) => (
          <button
            key={button.name}
            type="button"
            className={
              "touch-button " +
              (selected === button.name && edit ? "selected" : "")
            }
            aria-label={`Touch ${button.name}`}
            style={{
              left: button.x + "%",
              top: button.y + "%",
              width: button.size,
              height: button.size,
              opacity: button.opacity,
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* Synthetic/test pointers may lack an active capture id. */
              }
              if (edit) setSelected(button.name);
              else router?.press(`touch:${e.pointerId}`, commands[button.name]);
            }}
            onPointerMove={(e) => {
              if (!edit || !e.buttons || !area.current) return;
              const box = area.current.getBoundingClientRect();
              change(button.name, {
                x: clamp(((e.clientX - box.left) / box.width) * 100, 5, 95),
                y: clamp(((e.clientY - box.top) / box.height) * 100, 6, 94),
              });
            }}
            onPointerUp={(e) => router?.release(`touch:${e.pointerId}`)}
            onPointerCancel={(e) => router?.release(`touch:${e.pointerId}`)}
            onLostPointerCapture={(e) =>
              router?.release(`touch:${e.pointerId}`)
            }
          >
            {(
              { Up: "↑", Down: "↓", Left: "←", Right: "→" } as Record<
                string,
                string
              >
            )[button.name] ?? button.name}
          </button>
        ))}
        {analog && !edit && (
          <button
            type="button"
            className="analog"
            aria-label="Analog stick"
            onPointerDown={(e) => {
              e.preventDefault();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }}
            onPointerMove={(e) => {
              if (!e.buttons) return;
              const b = e.currentTarget.getBoundingClientRect();
              const x = clamp(
                (e.clientX - b.left - b.width / 2) / (b.width / 2),
                -1,
                1,
              );
              const y = clamp(
                (e.clientY - b.top - b.height / 2) / (b.height / 2),
                -1,
                1,
              );
              router?.press(
                `analog:${e.pointerId}:x`,
                16,
                Math.round(x * 32767),
              );
              router?.press(
                `analog:${e.pointerId}:y`,
                17,
                Math.round(y * 32767),
              );
            }}
            onPointerUp={(e) => {
              router?.release(`analog:${e.pointerId}:x`);
              router?.release(`analog:${e.pointerId}:y`);
            }}
            onPointerCancel={(e) => {
              router?.release(`analog:${e.pointerId}:x`);
              router?.release(`analog:${e.pointerId}:y`);
            }}
          >
            ◎
          </button>
        )}
      </div>
      {edit && (
        <div className="panel layout-editor" role="region" aria-label="Touch layout editor">
          <h3>Touch layout · {orientation}</h3>
          <p>
            Drag buttons on the game surface. Changes stay local until you save.
            {dirty ? " Unsaved changes." : ""}
          </p>
          <label>
            Button
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {active.map((b) => (
                <option key={b.name}>{b.name}</option>
              ))}
            </select>
          </label>
          <label>
            Size
            <input
              type="range"
              min="36"
              max="84"
              value={current.size}
              onChange={(e) => change(selected, { size: +e.target.value })}
            />
          </label>
          <label>
            Opacity
            <input
              type="range"
              min=".25"
              max="1"
              step=".05"
              value={current.opacity}
              onChange={(e) => change(selected, { opacity: +e.target.value })}
            />
          </label>
          <button type="button" onClick={() => void saveLayout()}>
            Save layout
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDraft(defaults.map((b) => ({ ...b })));
              setDirty(true);
            }}
          >
            Restore defaults
          </button>
          <button type="button" className="secondary" onClick={cancelEdit}>
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
