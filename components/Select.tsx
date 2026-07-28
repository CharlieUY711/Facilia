"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  placeholder?: string;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className, id, ...props }, ref) => {
    const selectId = id || props.name;

    if (label) {
      // Etiqueta dentro del selector: caption pequeña arriba, valor debajo,
      // todo dentro del mismo box con borde.
      return (
        <div className="w-full">
          <div
            className={clsx(
              "rounded-xl border px-3.5 py-2 bg-white",
              "focus-within:ring-2 focus-within:ring-blue/30 focus-within:border-blue transition-colors",
              error ? "border-red-400" : "border-navy-100",
              className
            )}
          >
            <label htmlFor={selectId} className="block text-[10px] font-semibold uppercase tracking-wide text-navy/50">
              {label}
            </label>
            <select
              ref={ref}
              id={selectId}
              className="w-full bg-transparent text-sm text-ink outline-none border-0 p-0 mt-0.5"
              {...props}
            >
              {placeholder && <option value="">{placeholder}</option>}
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );
    }

    return (
      <div className="w-full">
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            "w-full rounded-xl border px-4 py-2.5 text-sm font-body text-ink bg-white",
            "focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-colors",
            error ? "border-red-400" : "border-navy-100",
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export default Select;
