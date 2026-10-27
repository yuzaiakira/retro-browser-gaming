"use client";
import { useEffect, useId, useRef } from "react";

function focusableIn(root: HTMLElement) {
  return [
    ...root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ];
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const closed = useRef(false);

  useEffect(() => {
    if (!open) return;
    closed.current = false;
    window.dispatchEvent(new CustomEvent("rbg:overlay-open"));
    // Prefer Cancel for destructive confirms so Enter/Space cannot fire accidentally.
    (danger ? cancelRef.current : confirmRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (closed.current) return;
        closed.current = true;
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const list = focusableIn(panelRef.current);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onCancel, danger]);

  if (!open) return null;

  return (
    <div
      className="confirm-backdrop"
      role="presentation"
      onClick={() => {
        if (closed.current) return;
        closed.current = true;
        onCancel();
      }}
    >
      <div
        ref={panelRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="secondary"
            onClick={() => {
              if (closed.current) return;
              closed.current = true;
              onCancel();
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? "danger" : undefined}
            onClick={() => {
              if (closed.current) return;
              closed.current = true;
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
