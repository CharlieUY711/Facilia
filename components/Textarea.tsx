"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, rows = 3, ...props }, ref) => {
    const areaId = id || props.name;

    if (label) {
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
            <label htmlFor={areaId} className="block text-[10px] font-semibold uppercase tracking-wide text-navy/50">
              {label}
            </label>
            <textarea
              ref={ref}
              id={areaId}
              rows={rows}
              className="w-full bg-transparent text-sm font-body text-ink placeholder:text-ink/30 outline-none border-0 p-0 mt-0.5 resize-none"
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
        <textarea
          ref={ref}
          id={areaId}
          rows={rows}
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
Textarea.displayName = "Textarea";

export default Textarea;
