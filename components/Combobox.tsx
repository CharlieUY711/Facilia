"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  label?: string;
  placeholder?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  /** Texto del ítem "vaciar selección" (si no se pasa, no se muestra). */
  clearLabel?: string;
  /** Si se pasa, aparece "+ crear ..." cuando lo que se escribe no coincide con nada de la lista. */
  onCreateNew?: (query: string) => void;
  createLabel?: string;
}

export default function Combobox({
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
  disabled,
  className,
  clearLabel,
  onCreateNew,
  createLabel = "Crear nueva",
}: ComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  // Sincroniza el texto mostrado con la selección real cuando el campo
  // no está enfocado (evita pisar lo que el usuario está tipeando).
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setQuery(selected ? selected.label : "");
    }
  }, [selected]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected ? selected.label : "");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && q === selected.label.toLowerCase())) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q));
  }, [options, query, selected]);

  const showCreate =
    !!onCreateNew &&
    query.trim().length > 0 &&
    !options.some((o) => o.label.trim().toLowerCase() === query.trim().toLowerCase());

  // Lista total navegable por teclado: [opción vaciar?] + opciones + [crear?]
  const rows: { type: "clear" | "option" | "create"; option?: ComboboxOption }[] = [
    ...(clearLabel ? [{ type: "clear" as const }] : []),
    ...filtered.map((o) => ({ type: "option" as const, option: o })),
    ...(showCreate ? [{ type: "create" as const }] : []),
  ];

  function openList() {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function pick(row: (typeof rows)[number]) {
    if (row.type === "clear") {
      onChange("");
      setQuery("");
    } else if (row.type === "option" && row.option) {
      onChange(row.option.value);
      setQuery(row.option.label);
    } else if (row.type === "create") {
      onCreateNew?.(query.trim());
    }
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[activeIndex]) pick(rows[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selected ? selected.label : "");
      inputRef.current?.blur();
    }
  }

  return (
    <div className="w-full relative" ref={containerRef}>
      <div
        className={clsx(
          "rounded-xl border px-3.5 py-2 bg-white cursor-text",
          "focus-within:ring-2 focus-within:ring-blue/30 focus-within:border-blue transition-colors",
          error ? "border-red-400" : "border-navy-100",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onMouseDown={() => inputRef.current?.focus()}
      >
        {label && (
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-navy/50">{label}</label>
        )}
        <input
          ref={inputRef}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={openList}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-sm font-body text-ink placeholder:text-ink/30 outline-none border-0 p-0 mt-0.5"
          autoComplete="off"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && !disabled && (
        <div className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-navy-100 bg-white shadow-soft py-1">
          {clearLabel && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick({ type: "clear" })}
              className={clsx(
                "w-full text-left px-3.5 py-2 text-sm text-ink/50 italic hover:bg-navy-50",
                rows[activeIndex]?.type === "clear" && "bg-navy-50"
              )}
            >
              {clearLabel}
            </button>
          )}

          {filtered.length === 0 && !showCreate && (
            <p className="px-3.5 py-2 text-sm text-ink/40">Sin resultados</p>
          )}

          {filtered.map((o) => {
            const idx = rows.findIndex((r) => r.type === "option" && r.option?.value === o.value);
            return (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick({ type: "option", option: o })}
                className={clsx(
                  "w-full text-left px-3.5 py-2 text-sm text-ink hover:bg-navy-50 flex flex-col",
                  idx === activeIndex && "bg-navy-50",
                  o.value === value && "font-medium text-navy"
                )}
              >
                <span>{o.label}</span>
                {o.sublabel && <span className="text-xs text-ink/40">{o.sublabel}</span>}
              </button>
            );
          })}

          {showCreate && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick({ type: "create" })}
              className={clsx(
                "w-full text-left px-3.5 py-2 text-sm text-blue font-medium hover:bg-blue-50 border-t border-navy-100 mt-1 pt-2",
                rows[activeIndex]?.type === "create" && "bg-blue-50"
              )}
            >
              + {createLabel} “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}
