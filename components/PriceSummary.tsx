import { CotizacionResult } from "@/lib/calculatePrice";
import { formatCurrency } from "@/lib/formatCurrency";
import Card from "./Card";

export default function PriceSummary({ cotizacion }: { cotizacion: CotizacionResult | null }) {
  if (!cotizacion) {
    return (
      <Card className="sticky top-24">
        <p className="font-display font-semibold text-navy mb-2">Tu presupuesto</p>
        <p className="text-sm text-ink/50">
          Completá los datos del servicio para ver el precio calculado en tiempo real.
        </p>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24 animate-fadeUp">
      <p className="font-display font-semibold text-navy mb-4">Tu presupuesto</p>
      <ul className="space-y-2 mb-4">
        {cotizacion.lineas.map((linea, i) => (
          <li key={i} className="flex justify-between text-sm text-ink/70">
            <span>{linea.concepto}</span>
            <span className="font-medium text-ink">{formatCurrency(linea.monto_mensual)}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-navy-100 pt-4 space-y-1.5">
        <div className="flex justify-between text-sm text-ink/60">
          <span>Total por visita</span>
          <span>{formatCurrency(cotizacion.total_por_visita)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="font-display font-semibold text-navy">Total mensual</span>
          <span className="font-display font-bold text-2xl text-orange">
            {formatCurrency(cotizacion.total_mensual)}
          </span>
        </div>
      </div>
      <div className="mt-4 bg-orange-50 rounded-xl p-3 text-xs text-navy font-medium">
        🎁 Incluye {cotizacion.regalo_bienvenida.descripcion} de regalo al contratar.
      </div>
    </Card>
  );
}
