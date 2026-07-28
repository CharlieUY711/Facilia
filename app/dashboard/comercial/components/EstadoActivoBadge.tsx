import clsx from "clsx";

/**
 * Mismo patrón visual que ESTADO_COLOR en app/panel/page.tsx
 * (pill de color con texto), aplicado acá a activo/inactivo.
 */
export default function EstadoActivoBadge({ active }: { active: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        active ? "bg-green-100 text-green-700" : "bg-navy-50 text-ink/50"
      )}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
