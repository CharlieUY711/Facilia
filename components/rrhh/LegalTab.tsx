"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Modal from "@/components/Modal";
import {
  ESTADO_DOCUMENTO_LABEL,
  ESTADO_LABORAL_LABEL,
  TIPO_CONTRATO_LABEL,
  type EstadoLaboral,
  type PersonaLegajo,
  type RrhhDocumento,
  type TipoContrato,
} from "@/lib/rrhh/types";

interface LegalTabProps {
  persona: PersonaLegajo;
  mode: "admin" | "self";
  onPersonaUpdated: (p: PersonaLegajo) => void;
}

const TIPO_CONTRATO_OPTIONS = (Object.keys(TIPO_CONTRATO_LABEL) as TipoContrato[]).map((v) => ({
  value: v,
  label: TIPO_CONTRATO_LABEL[v],
}));
const ESTADO_LABORAL_OPTIONS = (Object.keys(ESTADO_LABORAL_LABEL) as EstadoLaboral[]).map((v) => ({
  value: v,
  label: ESTADO_LABORAL_LABEL[v],
}));

export default function LegalTab({ persona, mode, onPersonaUpdated }: LegalTabProps) {
  const [documentos, setDocumentos] = useState<RrhhDocumento[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cargarModal, setCargarModal] = useState(false);
  const [subirPersonalModal, setSubirPersonalModal] = useState(false);
  const [resolverDoc, setResolverDoc] = useState<RrhhDocumento | null>(null);

  const loadDocumentos = useCallback(async () => {
    setLoadingDocs(true);
    const res = await fetch(`/api/rrhh/documentos?persona_id=${persona.id}`).then((r) => r.json());
    if (res.ok) setDocumentos(res.documentos);
    else setError(res.error || "No se pudieron cargar los documentos");
    setLoadingDocs(false);
  }, [persona.id]);

  useEffect(() => {
    loadDocumentos();
  }, [loadDocumentos]);

  const documentosEmpresa = useMemo(() => documentos.filter((d) => d.categoria === "empresa"), [documentos]);
  const documentosPersonales = useMemo(() => documentos.filter((d) => d.categoria === "personal"), [documentos]);

  async function verDocumento(doc: RrhhDocumento) {
    setError(null);
    const res = await fetch(`/api/rrhh/documentos/${doc.id}/url`).then((r) => r.json());
    if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
    else setError(res.error || "No se pudo obtener el archivo");
  }

  async function pedirAccion(doc: RrhhDocumento, estado: "pendiente_firma" | "pendiente_completar" | "anulado") {
    setError(null);
    const form = new FormData();
    form.set("estado", estado);
    const res = await fetch(`/api/rrhh/documentos/${doc.id}`, { method: "PATCH", body: form }).then((r) =>
      r.json()
    );
    if (res.ok) await loadDocumentos();
    else setError(res.error || "No se pudo actualizar el documento");
  }

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

      <DatosLegalesCard persona={persona} mode={mode} onPersonaUpdated={onPersonaUpdated} onError={setError} />

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-navy">Documentos de la empresa</h3>
          {mode === "admin" && (
            <Button size="sm" onClick={() => setCargarModal(true)}>
              + Cargar documento
            </Button>
          )}
        </div>
        {loadingDocs ? (
          <p className="text-sm text-ink/40">Cargando...</p>
        ) : (
          <DocumentosLista
            documentos={documentosEmpresa}
            mode={mode}
            onVer={verDocumento}
            onPedirAccion={pedirAccion}
            onResolver={setResolverDoc}
            vacio="No hay documentos de la empresa todavía."
          />
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-navy">Documentos personales</h3>
          <Button size="sm" onClick={() => setSubirPersonalModal(true)}>
            + Subir documento personal
          </Button>
        </div>
        {loadingDocs ? (
          <p className="text-sm text-ink/40">Cargando...</p>
        ) : (
          <DocumentosLista
            documentos={documentosPersonales}
            mode={mode}
            onVer={verDocumento}
            onPedirAccion={pedirAccion}
            onResolver={setResolverDoc}
            vacio="No hay documentos personales todavía."
          />
        )}
      </Card>

      <CargarDocumentoModal
        open={cargarModal}
        personaId={persona.id}
        categoria="empresa"
        onClose={() => setCargarModal(false)}
        onSaved={loadDocumentos}
        onError={setError}
      />
      <CargarDocumentoModal
        open={subirPersonalModal}
        personaId={persona.id}
        categoria="personal"
        onClose={() => setSubirPersonalModal(false)}
        onSaved={loadDocumentos}
        onError={setError}
      />
      <ResolverPendienteModal
        doc={resolverDoc}
        onClose={() => setResolverDoc(null)}
        onSaved={loadDocumentos}
        onError={setError}
      />
    </div>
  );
}

// ── Datos legales ───────────────────────────────────────────────────

function DatosLegalesCard({
  persona,
  mode,
  onPersonaUpdated,
  onError,
}: {
  persona: PersonaLegajo;
  mode: "admin" | "self";
  onPersonaUpdated: (p: PersonaLegajo) => void;
  onError: (msg: string | null) => void;
}) {
  const [form, setForm] = useState({
    documento: persona.documento ?? "",
    fecha_nacimiento: persona.fecha_nacimiento ?? "",
    fecha_ingreso: persona.fecha_ingreso ?? "",
    fecha_egreso: persona.fecha_egreso ?? "",
    tipo_contrato: persona.tipo_contrato ?? "",
    salario: persona.salario?.toString() ?? "",
    estado_laboral: persona.estado_laboral,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      documento: persona.documento ?? "",
      fecha_nacimiento: persona.fecha_nacimiento ?? "",
      fecha_ingreso: persona.fecha_ingreso ?? "",
      fecha_egreso: persona.fecha_egreso ?? "",
      tipo_contrato: persona.tipo_contrato ?? "",
      salario: persona.salario?.toString() ?? "",
      estado_laboral: persona.estado_laboral,
    });
  }, [persona]);

  async function guardar() {
    setSaving(true);
    onError(null);
    const res = await fetch(`/api/rrhh/personas/${persona.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        salario: form.salario === "" ? null : Number(form.salario),
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.ok) onPersonaUpdated(res.persona);
    else onError(res.error || "No se pudo guardar");
  }

  if (mode === "self") {
    return (
      <Card className="space-y-4">
        <h3 className="font-display font-semibold text-navy">Datos legales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SoloLectura label="Documento" value={persona.documento} />
          <SoloLectura label="Fecha de nacimiento" value={persona.fecha_nacimiento} />
          <SoloLectura label="Fecha de ingreso" value={persona.fecha_ingreso} />
          <SoloLectura label="Fecha de egreso" value={persona.fecha_egreso} />
          <SoloLectura
            label="Tipo de contrato"
            value={persona.tipo_contrato ? TIPO_CONTRATO_LABEL[persona.tipo_contrato] : null}
          />
          <SoloLectura label="Salario" value={persona.salario != null ? String(persona.salario) : null} />
          <SoloLectura label="Estado laboral" value={ESTADO_LABORAL_LABEL[persona.estado_laboral]} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <h3 className="font-display font-semibold text-navy">Datos legales</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Documento"
          value={form.documento}
          onChange={(e) => setForm({ ...form, documento: e.target.value })}
        />
        <Input
          label="Fecha de nacimiento"
          type="date"
          value={form.fecha_nacimiento}
          onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
        />
        <Input
          label="Fecha de ingreso"
          type="date"
          value={form.fecha_ingreso}
          onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
        />
        <Input
          label="Fecha de egreso"
          type="date"
          value={form.fecha_egreso}
          onChange={(e) => setForm({ ...form, fecha_egreso: e.target.value })}
        />
        <Select
          label="Tipo de contrato"
          options={TIPO_CONTRATO_OPTIONS}
          placeholder="— Sin definir —"
          value={form.tipo_contrato}
          onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value })}
        />
        <Input
          label="Salario"
          type="number"
          value={form.salario}
          onChange={(e) => setForm({ ...form, salario: e.target.value })}
        />
        <Select
          label="Estado laboral"
          options={ESTADO_LABORAL_OPTIONS}
          value={form.estado_laboral}
          onChange={(e) => setForm({ ...form, estado_laboral: e.target.value as EstadoLaboral })}
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={guardar} loading={saving}>
          Guardar
        </Button>
      </div>
    </Card>
  );
}

function SoloLectura({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/50">{label}</p>
      <p className="text-sm text-ink mt-0.5">{value || "—"}</p>
    </div>
  );
}

// ── Lista de documentos ─────────────────────────────────────────────

function DocumentosLista({
  documentos,
  mode,
  onVer,
  onPedirAccion,
  onResolver,
  vacio,
}: {
  documentos: RrhhDocumento[];
  mode: "admin" | "self";
  onVer: (doc: RrhhDocumento) => void;
  onPedirAccion: (doc: RrhhDocumento, estado: "pendiente_firma" | "pendiente_completar" | "anulado") => void;
  onResolver: (doc: RrhhDocumento) => void;
  vacio: string;
}) {
  if (documentos.length === 0) {
    return <p className="text-sm text-ink/40">{vacio}</p>;
  }

  return (
    <div className="divide-y divide-navy-100">
      {documentos.map((doc) => {
        const esPendiente = doc.estado === "pendiente_firma" || doc.estado === "pendiente_completar";
        const badgeClass =
          doc.estado === "vigente"
            ? "bg-navy-50 text-navy/70"
            : doc.estado === "anulado"
            ? "bg-ink/5 text-ink/40"
            : "bg-orange-50 text-orange-700";

        return (
          <div key={doc.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-navy">{doc.nombre}</p>
              <p className="text-xs text-ink/50">{doc.tipo || "—"}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeClass}`}>
                {ESTADO_DOCUMENTO_LABEL[doc.estado]}
              </span>
              {doc.storage_path && (
                <Button size="sm" variant="ghost" onClick={() => onVer(doc)}>
                  Ver
                </Button>
              )}
              {esPendiente && mode === "self" && (
                <Button size="sm" onClick={() => onResolver(doc)}>
                  Resolver
                </Button>
              )}
              {mode === "admin" && doc.estado === "vigente" && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => onPedirAccion(doc, "pendiente_firma")}>
                    Pedir firma
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onPedirAccion(doc, "pendiente_completar")}>
                    Pedir completar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onPedirAccion(doc, "anulado")}>
                    Anular
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal: cargar documento (empresa o personal, con o sin archivo) ──

function CargarDocumentoModal({
  open,
  personaId,
  categoria,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  personaId: string;
  categoria: "empresa" | "personal";
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pedido, setPedido] = useState<"" | "pendiente_firma" | "pendiente_completar">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNombre("");
      setTipo("");
      setFile(null);
      setPedido("");
    }
  }, [open]);

  async function submit() {
    if (!nombre.trim()) {
      onError("El nombre es obligatorio.");
      return;
    }
    if (!file && categoria === "personal") {
      onError("Adjuntá un archivo.");
      return;
    }
    if (!file && !pedido) {
      onError("Adjuntá un archivo, o elegí pedir firma / pedir completar.");
      return;
    }
    setSaving(true);
    onError(null);
    const form = new FormData();
    form.set("persona_id", personaId);
    form.set("categoria", categoria);
    form.set("nombre", nombre.trim());
    if (tipo) form.set("tipo", tipo);
    if (file) form.set("file", file);
    if (!file && pedido) form.set("estado", pedido);

    const res = await fetch("/api/rrhh/documentos", { method: "POST", body: form }).then((r) => r.json());
    setSaving(false);
    if (res.ok) {
      onClose();
      await onSaved();
    } else {
      onError(res.error || "No se pudo cargar el documento");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={categoria === "empresa" ? "Cargar documento de la empresa" : "Subir documento personal"}
    >
      <div className="space-y-4">
        <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input
          label="Tipo (opcional)"
          placeholder="Ej: contrato, certificado, cédula"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        />
        <div className="w-full">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/50 mb-1">Archivo</p>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink/70"
          />
        </div>
        {categoria === "empresa" && !file && (
          <Select
            label="Sin archivo — pedirle al colaborador que:"
            placeholder="— Elegí una opción —"
            options={[
              { value: "pendiente_firma", label: "Firme el documento" },
              { value: "pendiente_completar", label: "Complete el documento" },
            ]}
            value={pedido}
            onChange={(e) => setPedido(e.target.value as typeof pedido)}
          />
        )}
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

// ── Modal: resolver pendiente (subir archivo firmado/completo) ──────

function ResolverPendienteModal({
  doc,
  onClose,
  onSaved,
  onError,
}: {
  doc: RrhhDocumento | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFile(null);
  }, [doc]);

  async function submit() {
    if (!doc) return;
    if (!file) {
      onError("Adjuntá el archivo.");
      return;
    }
    setSaving(true);
    onError(null);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/rrhh/documentos/${doc.id}`, { method: "PATCH", body: form }).then((r) =>
      r.json()
    );
    setSaving(false);
    if (res.ok) {
      onClose();
      await onSaved();
    } else {
      onError(res.error || "No se pudo resolver el pendiente");
    }
  }

  return (
    <Modal open={!!doc} onClose={onClose} title={`Resolver: ${doc?.nombre ?? ""}`}>
      <div className="space-y-4">
        <div className="w-full">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/50 mb-1">Archivo</p>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink/70"
          />
        </div>
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
