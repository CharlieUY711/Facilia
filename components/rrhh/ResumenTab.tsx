"use client";

import Card from "@/components/Card";
import { ESTADO_LABORAL_LABEL, type PersonaLegajo } from "@/lib/rrhh/types";

interface ResumenTabProps {
  persona: PersonaLegajo;
}

function antiguedad(fechaIngreso: string | null): string | null {
  if (!fechaIngreso) return null;
  const inicio = new Date(fechaIngreso);
  if (Number.isNaN(inicio.getTime())) return null;

  const hoy = new Date();
  let años = hoy.getFullYear() - inicio.getFullYear();
  let meses = hoy.getMonth() - inicio.getMonth();
  if (hoy.getDate() < inicio.getDate()) meses -= 1;
  if (meses < 0) {
    años -= 1;
    meses += 12;
  }
  if (años < 0) return null;

  const partes: string[] = [];
  if (años > 0) partes.push(`${años} ${años === 1 ? "año" : "años"}`);
  if (meses > 0 || años === 0) partes.push(`${meses} ${meses === 1 ? "mes" : "meses"}`);
  return partes.join(" y ");
}

function Campo({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/50">{label}</p>
      <p className="text-sm text-ink mt-0.5">{value ?? "—"}</p>
    </div>
  );
}

export default function ResumenTab({ persona }: ResumenTabProps) {
  const antig = antiguedad(persona.fecha_ingreso);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="space-y-4">
        <h3 className="font-display font-semibold text-navy">Contacto</h3>
        <div className="grid grid-cols-1 gap-4">
          <Campo label="Email" value={persona.email} />
          <Campo label="Teléfono" value={persona.telefono} />
          <Campo label="Dirección" value={persona.direccion} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-display font-semibold text-navy">Puesto</h3>
        <div className="grid grid-cols-1 gap-4">
          <Campo label="Cargo" value={persona.cargo} />
          <Campo label="Organización" value={persona.organizaciones?.nombre ?? null} />
          <Campo label="Locación" value={persona.locaciones?.nombre ?? null} />
        </div>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-display font-semibold text-navy">Situación laboral</h3>
        <div className="grid grid-cols-1 gap-4">
          <Campo label="Estado" value={ESTADO_LABORAL_LABEL[persona.estado_laboral]} />
          <Campo label="Fecha de ingreso" value={persona.fecha_ingreso} />
          <Campo label="Antigüedad" value={antig} />
        </div>
      </Card>
    </div>
  );
}
