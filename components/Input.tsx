"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || props.name;

    if (label) {
      // Etiqueta siempre DENTRO del campo: caption chica arriba, valor
      // debajo, todo dentro del mismo box con borde (mismo patrón que Select).
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
            <label htmlFor={inputId} className="block text-[10px] font-semibold uppercase tracking-wide text-navy/50">
              {label}
            </label>
            <input
              ref={ref}
              id={inputId}
              className="w-full bg-transparent text-sm font-body text-ink placeholder:text-ink/30 outline-none border-0 p-0 mt-0.5"
              {...props}
            />
          </div>
          {hint && !error && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
      );
    }

    return (
      <div className="w-full">
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            "w-full rounded-xl border px-4 py-2.5 text-sm font-body text-ink placeholder:text-ink/40",
            "focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue transition-colors",
            error ? "border-red-400" : "border-navy-100",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
