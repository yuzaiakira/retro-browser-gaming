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
  size: 48,
  opacity: 0.8,
}));
export default function TouchControls({
  router,
  system,
  edit,
  analog,
}: {
  router: InputRouter | null;
  system: string;
  edit: boolean;
  analog: boolean;
}) {
  const [orientation, setOrientation] = useState("landscape");
  const [layout, setLayout] = useState(defaults);
  const [selected, setSelected] = useState("A");
  const area = useRef<HTMLDivElement>(null);
  const key = `layout:${system}:${orientation}`;
  useEffect(() => {
    const update = () =>
      setOrientation(innerWidth > innerHeight ? "landscape" : "portrait");
    update();
    addEventListener("resize", update);
    return () => removeEventListener("resize", update);
  }, []);
  useEffect(() => {
    setting<Button[]>(key, defaults).then(setLayout);
  }, [key]);
  const change = (name: string, patch: Partial<Button>) =>
    setLayout((old) =>
      old.map((b) => (b.name === name ? { ...b, ...patch } : b)),
    );
  const current = layout.find((b) => b.name === selected)!;
  return (
    <>
      <div className={"touch-area " + (edit ? "editing" : "")} ref={area}>
        {layout.map((button) => (
          <button
            key={button.name}
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
                x: Math.max(
                  7,
                  Math.min(93, ((e.clientX - box.left) / box.width) * 100),
                ),
                y: Math.max(
                  8,
                  Math.min(88, ((e.clientY - box.top) / box.height) * 100),
                ),
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
            className="analog"
            aria-label="Analog stick"
            onPointerDown={(e) =>
              e.currentTarget.setPointerCapture(e.pointerId)
            }
            onPointerMove={(e) => {
              if (!e.buttons) return;
              const b = e.currentTarget.getBoundingClientRect();
              const x = Math.max(
                  -1,
                  Math.min(
                    1,
                    (e.clientX - b.left - b.width / 2) / (b.width / 2),
                  ),
                ),
                y = Math.max(
                  -1,
                  Math.min(
                    1,
                    (e.clientY - b.top - b.height / 2) / (b.height / 2),
                  ),
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
        <div className="panel layout-editor">
          <h3>Touch layout · {orientation}</h3>
          <p>Drag a button, then adjust its size and opacity.</p>
          <label>
            Button
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {layout.map((b) => (
                <option key={b.name}>{b.name}</option>
              ))}
            </select>
          </label>
          <label>
            Size
            <input
              type="range"
              min="36"
              max="72"
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
          <button
            onClick={async () => {
              await setSetting(key, layout);
            }}
          >
            Save layout
          </button>
          <button
            className="secondary"
            onClick={async () => {
              setLayout(defaults);
              await setSetting(key, defaults);
            }}
          >
            Restore defaults
          </button>
        </div>
      )}
    </>
  );
}
