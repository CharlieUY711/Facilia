import { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export default function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "bg-white rounded-2xl border border-navy-100/60 shadow-card",
        padded && "p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
