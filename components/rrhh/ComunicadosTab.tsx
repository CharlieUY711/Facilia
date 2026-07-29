"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Textarea from "@/components/Textarea";
import Modal from "@/components/Modal";
import type { RrhhComunicado } from "@/lib/rrhh/types";

interface ComunicadosTabProps {
  personaId: string;
  mode: "admin" | "self";
}

export default function ComunicadosTab({ personaId, mode }: ComunicadosTabProps) {
  const [comunicados, setComunicados] = useState<RrhhComunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nuevoModal, setNuevoModal] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/rrhh/comunicados?persona_id=${personaId}`).then((r) => r.json());
    if (res.ok) {
      setComunicados(res.comunicados);
      setError(null);
    } else {
      setError(res.error || "No se pudieron cargar los comunicados");
    }
    setLoading(false);
  }, [personaId]);

  useEffect(() => {
    load();
  }, [load]);

  async function marcarLeido(c: RrhhComunicado) {
    setBusyId(c.id);
    setError(null);
    const res = await fetch(`/api/rrhh/comunicados/${c.id}/leido`, { method: "POST" }).then((r) => r.json());
    if (res.ok) await load();
    else setError(res.error || "No se pudo marcar como leído");
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
        {mode === "admin" && <Button onClick={() => setNuevoModal(true)}>+ Nuevo comunicado</Button>}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Cargando...</p>
      ) : comunicados.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/40">No hay comunicados todavía.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {comunicados.map((c) => (
            <Card key={c.id} className="space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-navy">{c.titulo}</p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {c.para_todos ? "A todo el equipo" : `Dirigido a ${c.personas?.nombre ?? "esta persona"}`}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    c.leido ? "bg-navy-50 text-navy/70" : "bg-orange-50 text-orange-700"
                  }`}
                >
                  {c.leido ? "Leído" : "No leído"}
                </span>
              </div>
              <p className="text-sm text-ink/80 whitespace-pre-wrap">{c.cuerpo}</p>
              {mode === "self" && !c.leido && (
                <div className="flex justify-end">
                  <Button size="sm" disabled={busyId === c.id} onClick={() => marcarLeido(c)}>
                    Marcar como leído
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {mode === "admin" && (
        <NuevoComunicadoModal
          open={nuevoModal}
          personaId={personaId}
          onClose={() => setNuevoModal(false)}
          onSaved={load}
          onError={setError}
        />
      )}
    </div>
  );
}

// ── Modal: nuevo comunicado ───────────────────────────────────────────

function NuevoComunicadoModal({
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
  const [cuerpo, setCuerpo] = useState("");
  const [destinatario, setDestinatario] = useState<"todos" | "persona">("persona");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitulo("");
      setCuerpo("");
      setDestinatario("persona");
    }
  }, [open]);

  async function submit() {
    if (!titulo.trim() || !cuerpo.trim()) {
      onError("El título y el cuerpo son obligatorios.");
      return;
    }
    setSaving(true);
    onError(null);
    const res = await fetch("/api/rrhh/comunicados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim(),
        cuerpo: cuerpo.trim(),
        para_todos: destinatario === "todos",
        persona_id: destinatario === "persona" ? personaId : undefined,
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.ok) {
      onClose();
      await onSaved();
    } else {
      onError(res.error || "No se pudo crear el comunicado");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo comunicado">
      <div className="space-y-4">
        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <Textarea label="Cuerpo" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
        <Select
          label="Dirigido a"
          options={[
            { value: "persona", label: "Solo a esta persona" },
            { value: "todos", label: "A todo el equipo" },
          ]}
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value as "todos" | "persona")}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving}>
            Enviar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
