"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import Modal from "@/components/Modal";
import { ESTADO_TAREA_LABEL, type EstadoTarea, type RrhhTarea } from "@/lib/rrhh/types";

interface TareasTabProps {
  personaId: string;
  mode: "admin" | "self";
}

const ESTADO_TAREA_OPTIONS = (Object.keys(ESTADO_TAREA_LABEL) as EstadoTarea[]).map((v) => ({
  value: v,
  label: ESTADO_TAREA_LABEL[v],
}));

function siguienteEstado(estado: EstadoTarea): EstadoTarea {
  if (estado === "pendiente") return "en_curso";
  if (estado === "en_curso") return "completada";
  return "pendiente";
}

export default function TareasTab({ personaId, mode }: TareasTabProps) {
  const [tareas, setTareas] = useState<RrhhTarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevaModal, setNuevaModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/rrhh/tareas?persona_id=${personaId}`).then((r) => r.json());
    if (res.ok) {
      setTareas(res.tareas);
      setError(null);
    } else {
      setError(res.error || "No se pudieron cargar las tareas");
    }
    setLoading(false);
  }, [personaId]);

  useEffect(() => {
    load();
  }, [load]);

  async function cambiarEstado(tarea: RrhhTarea, estado: EstadoTarea) {
    setBusyId(tarea.id);
    setError(null);
    const res = await fetch(`/api/rrhh/tareas/${tarea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    }).then((r) => r.json());
    if (res.ok) await load();
    else setError(res.error || "No se pudo cambiar el estado");
    setBusyId(null);
  }

  async function eliminar(tarea: RrhhTarea) {
    if (!confirm(`¿Eliminar la tarea "${tarea.titulo}"?`)) return;
    setBusyId(tarea.id);
    setError(null);
    const res = await fetch(`/api/rrhh/tareas/${tarea.id}`, { method: "DELETE" }).then((r) => r.json());
    if (res.ok) await load();
    else setError(res.error || "No se pudo eliminar la tarea");
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            ×
          </button>
        </p>
      )}

      <div className="flex justify-end">
        {mode === "admin" && <Button onClick={() => setNuevaModal(true)}>+ Nueva tarea</Button>}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Cargando...</p>
      ) : tareas.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/40">No hay tareas todavía.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tareas.map((t) => {
            const disabled = busyId === t.id;
            const badgeClass =
              t.estado === "completada"
                ? "bg-green-50 text-green-700"
                : t.estado === "en_curso"
                ? "bg-blue-50 text-blue-700"
                : "bg-navy-50 text-navy/70";
            return (
              <Card key={t.id} className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{t.titulo}</p>
                  {t.descripcion && <p className="text-sm text-ink/60 mt-0.5">{t.descripcion}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-ink/50">
                    {t.fecha && <span>{t.fecha}</span>}
                    {t.locaciones && <span>📍 {t.locaciones.nombre}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeClass}`}>
                    {ESTADO_TAREA_LABEL[t.estado]}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => cambiarEstado(t, siguienteEstado(t.estado))}
                  >
                    Avanzar estado
                  </Button>
                  {mode === "admin" && (
                    <Button size="sm" variant="danger" disabled={disabled} onClick={() => eliminar(t)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {mode === "admin" && (
        <NuevaTareaModal
          open={nuevaModal}
          personaId={personaId}
          onClose={() => setNuevaModal(false)}
          onSaved={load}
          onError={setError}
        />
      )}
    </div>
  );
}

// ── Modal: nueva tarea ────────────────────────────────────────────────

interface LocacionOpcion {
  id: string;
  nombre: string;
}

function NuevaTareaModal({
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
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [locacionId, setLocacionId] = useState("");
  const [locaciones, setLocaciones] = useState<LocacionOpcion[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitulo("");
      setDescripcion("");
      setFecha("");
      setLocacionId("");
      fetch("/api/locaciones")
        .then((r) => r.json())
        .then((res) => {
          if (res.ok) setLocaciones(res.locaciones);
        });
    }
  }, [open]);

  async function submit() {
    if (!titulo.trim()) {
      onError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    onError(null);
    const res = await fetch("/api/rrhh/tareas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona_id: personaId,
        titulo: titulo.trim(),
        descripcion: descripcion || null,
        fecha: fecha || null,
        locacion_id: locacionId || null,
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.ok) {
      onClose();
      await onSaved();
    } else {
      onError(res.error || "No se pudo crear la tarea");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva tarea">
      <div className="space-y-4">
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <Textarea
          label="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Fecha (opcional)" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <Select
            label="Locación (opcional)"
            placeholder="— Sin locación —"
            options={locaciones.map((l) => ({ value: l.id, label: l.nombre }))}
            value={locacionId}
            onChange={(e) => setLocacionId(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Crear
          </Button>
        </div>
      </div>
    </Modal>
  );
}
