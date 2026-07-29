"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Modal from "@/components/Modal";
import {
  ESTADO_ASISTENCIA_LABEL,
  type EstadoAsistencia,
  type RrhhAsistencia,
  type RrhhHaber,
} from "@/lib/rrhh/types";

interface EvolucionTabProps {
  personaId: string;
  mode: "admin" | "self";
}

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const ESTADO_COLOR: Record<EstadoAsistencia, string> = {
  presente: "#0169F5", // blue
  tarde: "#D97400", // orange
  ausente: "#DC2626", // red-600
  licencia: "#5D7FB8", // navy-300
};

const ESTADO_ASISTENCIA_OPTIONS = (Object.keys(ESTADO_ASISTENCIA_LABEL) as EstadoAsistencia[]).map((v) => ({
  value: v,
  label: ESTADO_ASISTENCIA_LABEL[v],
}));

function currentYear() {
  return new Date().getFullYear();
}

export default function EvolucionTab({ personaId, mode }: EvolucionTabProps) {
  const [anio, setAnio] = useState(currentYear());
  const [asistencias, setAsistencias] = useState<RrhhAsistencia[]>([]);
  const [haberes, setHaberes] = useState<RrhhHaber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asistenciaModal, setAsistenciaModal] = useState(false);
  const [haberModal, setHaberModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/rrhh/evolucion?persona_id=${personaId}&anio=${anio}`).then((r) => r.json());
    if (res.ok) {
      setAsistencias(res.asistencias);
      setHaberes(res.haberes);
      setError(null);
    } else {
      setError(res.error || "No se pudo cargar la evolución");
    }
    setLoading(false);
  }, [personaId, anio]);

  useEffect(() => {
    load();
  }, [load]);

  const asistenciasPorMes = useMemo(() => {
    const porMes: Record<number, Record<EstadoAsistencia, number>> = {};
    for (let m = 0; m < 12; m++) porMes[m] = { presente: 0, tarde: 0, ausente: 0, licencia: 0 };
    for (const a of asistencias) {
      const mes = new Date(a.fecha).getUTCMonth();
      porMes[mes][a.estado] += 1;
    }
    return porMes;
  }, [asistencias]);

  const haberesPorMes = useMemo(() => {
    const porMes: Record<number, number> = {};
    for (let m = 0; m < 12; m++) porMes[m] = 0;
    for (const h of haberes) porMes[h.mes - 1] = h.monto;
    return porMes;
  }, [haberes]);

  const maxAsistenciasDia = useMemo(() => {
    let max = 1;
    for (let m = 0; m < 12; m++) {
      const total = Object.values(asistenciasPorMes[m]).reduce((a, b) => a + b, 0);
      if (total > max) max = total;
    }
    return max;
  }, [asistenciasPorMes]);

  const maxHaber = useMemo(() => {
    let max = 1;
    for (let m = 0; m < 12; m++) if (haberesPorMes[m] > max) max = haberesPorMes[m];
    return max;
  }, [haberesPorMes]);

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            ×
          </button>
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => setAnio((y) => y - 1)}>
          ← {anio - 1}
        </Button>
        <span className="font-display font-semibold text-navy text-lg">{anio}</span>
        <Button size="sm" variant="ghost" onClick={() => setAnio((y) => y + 1)} disabled={anio >= currentYear()}>
          {anio + 1} →
        </Button>

        {mode === "admin" && (
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" onClick={() => setAsistenciaModal(true)}>
              + Cargar asistencia
            </Button>
            <Button size="sm" onClick={() => setHaberModal(true)}>
              + Cargar haberes
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Cargando...</p>
      ) : (
        <>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-navy">Asistencias por mes</h3>
              <div className="flex items-center gap-3 text-xs text-ink/60">
                {(Object.keys(ESTADO_ASISTENCIA_LABEL) as EstadoAsistencia[]).map((e) => (
                  <span key={e} className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ESTADO_COLOR[e] }} />
                    {ESTADO_ASISTENCIA_LABEL[e]}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2 h-40">
              {MESES.map((label, m) => {
                const conteo = asistenciasPorMes[m];
                const total = Object.values(conteo).reduce((a, b) => a + b, 0);
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full flex flex-col-reverse rounded-t-md overflow-hidden bg-navy-50"
                      style={{ height: "9rem" }}
                      title={`${label}: ${total} día${total === 1 ? "" : "s"}`}
                    >
                      {(Object.keys(conteo) as EstadoAsistencia[]).map((estado) => {
                        const valor = conteo[estado];
                        if (valor === 0) return null;
                        const pct = (valor / maxAsistenciasDia) * 100;
                        return (
                          <div
                            key={estado}
                            style={{ height: `${pct}%`, backgroundColor: ESTADO_COLOR[estado] }}
                            title={`${ESTADO_ASISTENCIA_LABEL[estado]}: ${valor}`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-ink/50">{label}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-display font-semibold text-navy">Haberes liquidados por mes</h3>
            <div className="flex items-end gap-2 h-40">
              {MESES.map((label, m) => {
                const monto = haberesPorMes[m];
                const pct = monto > 0 ? (monto / maxHaber) * 100 : 0;
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end bg-navy-50 rounded-t-md" style={{ height: "9rem" }}>
                      {monto > 0 && (
                        <div
                          className="w-full bg-orange rounded-t-md"
                          style={{ height: `${pct}%` }}
                          title={`${label}: $${monto.toLocaleString("es-UY")}`}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-ink/50">{label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {mode === "admin" && (
        <>
          <CargarAsistenciaModal
            open={asistenciaModal}
            personaId={personaId}
            onClose={() => setAsistenciaModal(false)}
            onSaved={load}
            onError={setError}
          />
          <CargarHaberModal
            open={haberModal}
            personaId={personaId}
            anioActual={anio}
            onClose={() => setHaberModal(false)}
            onSaved={load}
            onError={setError}
          />
        </>
      )}
    </div>
  );
}

// ── Modal: cargar/corregir un día de asistencia ─────────────────────

function CargarAsistenciaModal({
  open,
  personaId,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  personaId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState<EstadoAsistencia>("presente");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFecha("");
      setEstado("presente");
      setNotas("");
    }
  }, [open]);

  async function submit() {
    if (!fecha) {
      onError("Elegí una fecha.");
      return;
    }
    setSaving(true);
    onError(null);
    const res = await fetch("/api/rrhh/asistencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona_id: personaId, fecha, estado, notas: notas || null }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.ok) {
      onClose();
      await onSaved();
    } else {
      onError(res.error || "No se pudo guardar la asistencia");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cargar / corregir asistencia">
      <div className="space-y-4">
        <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <Select
          label="Estado"
          options={ESTADO_ASISTENCIA_OPTIONS}
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoAsistencia)}
        />
        <Input label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Modal: cargar/corregir haberes de un mes ─────────────────────────

function CargarHaberModal({
  open,
  personaId,
  anioActual,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  personaId: string;
  anioActual: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [anio, setAnio] = useState(anioActual);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [monto, setMonto] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAnio(anioActual);
      setMes(new Date().getMonth() + 1);
      setMonto("");
    }
  }, [open, anioActual]);

  async function submit() {
    if (!monto || Number.isNaN(Number(monto))) {
      onError("Ingresá un monto válido.");
      return;
    }
    setSaving(true);
    onError(null);
    const res = await fetch("/api/rrhh/haberes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona_id: personaId, anio, mes, monto: Number(monto) }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.ok) {
      onClose();
      await onSaved();
    } else {
      onError(res.error || "No se pudieron guardar los haberes");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cargar / corregir haberes">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Año" type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} />
          <Select
            label="Mes"
            options={MESES.map((label, i) => ({ value: String(i + 1), label }))}
            value={String(mes)}
            onChange={(e) => setMes(Number(e.target.value))}
          />
        </div>
        <Input label="Monto" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
