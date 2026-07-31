"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-x">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm animate-fadeUp" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-soft max-w-lg w-full max-h-[85dvh] overflow-y-auto animate-fadeUp mb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-navy-100 sticky top-0 bg-white">
          {title && <h3 className="font-display font-semibold text-navy pr-4">{title}</h3>}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-ink/40 hover:text-ink transition-colors text-xl leading-none h-8 w-8 flex items-center justify-center shrink-0 -mr-1"
          >
            ×
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}
