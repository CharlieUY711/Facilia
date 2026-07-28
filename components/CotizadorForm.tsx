// components/CotizadorForm.tsx
"use client";

import { useEffect, useState } from "react";
import Card from "./Card";
import PriceSummary from "./PriceSummary";
import Input from "./Input";
import Select from "./Select";
import Button from "./Button";
import { fetchFormulario, Paso, Campo } from "@/lib/cotizador/formulario";

interface AmbienteRow {
  id: string;
  tipo_ambiente: string;
  m2: string;
  usuarios: string;
  luz_natural: string;
  ventana: string;
}

function newId() {
  return `amb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function CotizadorForm() {
  const [pasos, setPasos] = useState<Paso[]>([]);
  const [loadingForm, setLoadingForm] = useState(true);

  const [stepIndex, setStepIndex] = useState(0); // 0..N-1
  const [form, setForm] = useState<Record<string, any>>({});
  const [ambientes, setAmbientes] = useState<AmbienteRow[]>([]);

  const [cotizacionLive, setCotizacionLive] = useState<any | null>(null);
  const [cotizacionFinal, setCotizacionFinal] = useState<any | null>(null);
  const [leadResult, setLeadResult] = useState<any | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // 1) Cargar estructura del formulario
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchFormulario();
        setPasos(data.pasos);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingForm(false);
      }
    })();
  }, []);

  function updateField(codigo: string, value: any) {
    setForm((f) => ({ ...f, [codigo]: value }));
  }

  // 2) Ambientes (select_repetible)
  function addAmbiente() {
    setAmbientes((rows) => [
      ...rows,
      { id: newId(), tipo_ambiente: "", m2: "", usuarios: "", luz_natural: "", ventana: "" },
    ]);
  }

  function updateAmbiente(id: string, patch: Partial<AmbienteRow>) {
    setAmbientes((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeAmbiente(id: string) {
    setAmbientes((rows) => rows.filter((r) => r.id !== id));
  }

  const ambientesCompletos =
    ambientes.length > 0 && ambientes.every((a) => a.tipo_ambiente && Number(a.m2) > 0);

  // 3) Cálculo en vivo (igual que hoy)
  useEffect(() => {
    if (!ambientesCompletos) {
      setCotizacionLive(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/cotizar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ambientes: buildAmbientesPayload(),
            frecuencia: form["FRECUENCIA"],
            estructura: buildEstructura(),
            opcionales: buildOpcionales(),
          }),
        });
        const data = await res.json();
        if (data.ok) setCotizacionLive(data.cotizacion);
      } catch {
        // no interrumpir
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [
    ambientesCompletos,
    JSON.stringify(ambientes),
    JSON.stringify(buildOpcionales()),
    form["FRECUENCIA"],
    form["TIPO_ESPACIO"],
    form["PLANTAS"],
    form["SUBSUELOS"],
    form["BARBACOA_PERSONAS"],
    form["TURNOS"],
    form["USUARIOS_TOTALES"],
  ]);

  // 4) Payloads EXACTOS (no romper /api/leads)
  function buildAmbientesPayload() {
    return ambientes.map((a) => ({
      tipo_ambiente: a.tipo_ambiente,
      m2: Number(a.m2),
      ...(a.usuarios ? { usuarios: Number(a.usuarios) } : {}),
      ...(a.luz_natural ? { luz_natural: a.luz_natural === "si" } : {}),
      ...(a.ventana ? { ventana: a.ventana === "si" } : {}),
    }));
  }

  function buildEstructura() {
    return {
      tipo_espacio: form["TIPO_ESPACIO"],
      plantas: form["PLANTAS"],
      subsuelos: form["SUBSUELOS"],
      barbacoa_personas: form["BARBACOA_PERSONAS"],
      turnos: form["TURNOS"],
      horario: form["HORARIO"],
      usuarios_totales: form["USUARIOS_TOTALES"],
    };
  }

  function buildOpcionales() {
    const o: Record<string, any> = {};

    if (form["VAJILLA_TIPO"] && form["VAJILLA_CANTIDAD"]) {
      o.vajilla = {
        tipo: form["VAJILLA_TIPO"],
        cantidad: Number(form["VAJILLA_CANTIDAD"]),
        plazo: form["VAJILLA_PLAZO"],
      };
      if (form["VAJILLA_SANITIZACION"]) o.vajilla_sanitizacion_semanal = true;
    }

    if (form["LAVAVAJILLAS_TIPO"]) {
      o.lavavajillas = { tipo: form["LAVAVAJILLAS_TIPO"] };
    }

    if (form["CAFETERA"]) o.cafetera = form["CAFETERA"];
    if (form["DISPENSADOR_AGUA"]) o.dispensador_agua = form["DISPENSADOR_AGUA"];

    if (form["AMBIENTADORES_CANTIDAD"]) {
      o.ambientadores = { cantidad: Number(form["AMBIENTADORES_CANTIDAD"]) };
    }

    return o;
  }

  // 5) Envío final
  async function handleSubmit() {
    setErrorMsg(null);

    if (!ambientesCompletos) {
      setErrorMsg("Revisá los ambientes: falta el tipo o el metraje de alguno.");
      return;
    }
    if (!form["TELEFONO"] || !form["EMAIL"]) {
      setErrorMsg("Completá tu celular y tu email para enviarte el presupuesto.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form["NOMBRE"] || undefined,
          email: form["EMAIL"],
          telefono: form["TELEFONO"],
          empresa: form["EMPRESA"] || undefined,
          ambientes: buildAmbientesPayload(),
          frecuencia: form["FRECUENCIA"],
          estructura: buildEstructura(),
          opcionales: buildOpcionales(),
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "No pudimos generar tu presupuesto");

      setLeadResult(data.lead);
      setCotizacionFinal(data.cotizacion);
      setStepIndex(pasos.length - 1); // último paso
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setEnviando(false);
    }
  }

  // 6) Render dinámico de pasos y campos
  if (loadingForm) {
    return <p className="text-center py-20 text-ink/50">Cargando formulario…</p>;
  }

  const paso = pasos[stepIndex];

  function renderCampo(campo: Campo) {
    switch (campo.tipo_input) {
      case "select":
        return (
          <BoxSelect
            key={campo.id}
            label={campo.nombre}
            value={form[campo.codigo] ?? ""}
            onChange={(e) => updateField(campo.codigo, e.target.value)}
            options={campo.opciones}
          />
        );

      case "number":
        return (
          <BoxInput
            key={campo.id}
            label={campo.nombre}
            type="number"
            value={form[campo.codigo] ?? ""}
            onChange={(e) => updateField(campo.codigo, e.target.value)}
          />
        );

      case "text":
        return (
          <BoxInput
            key={campo.id}
            label={campo.nombre}
            value={form[campo.codigo] ?? ""}
            onChange={(e) => updateField(campo.codigo, e.target.value)}
          />
        );

      case "boolean":
        return (
          <label key={campo.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={!!form[campo.codigo]}
              onChange={(e) => updateField(campo.codigo, e.target.checked)}
              className="rounded border-navy-100 text-orange focus:ring-orange/30"
            />
            {campo.nombre}
          </label>
        );

      case "select_repetible":
        return renderAmbientesBlock(campo);
    }
  }

  function renderAmbientesBlock(campo: Campo) {
    return (
      <div key={campo.id} className="space-y-3">
        {ambientes.map((row) => (
          <div key={row.id} className="rounded-xl border border-navy-100 p-3">
            <div className="flex items-start gap-2">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1">
                <BoxSelect
                  label="Ambiente"
                  value={row.tipo_ambiente}
                  onChange={(e) => updateAmbiente(row.id, { tipo_ambiente: e.target.value })}
                  options={campo.opciones}
                />
                <BoxInput
                  label="Metraje (m²)"
                  type="number"
                  value={row.m2}
                  onChange={(e) => updateAmbiente(row.id, { m2: e.target.value })}
                />
                <BoxInput
                  label="Usuarios"
                  type="number"
                  value={row.usuarios}
                  onChange={(e) => updateAmbiente(row.id, { usuarios: e.target.value })}
                />
                <BoxSelect
                  label="Luz natural"
                  value={row.luz_natural}
                  onChange={(e) => updateAmbiente(row.id, { luz_natural: e.target.value })}
                  options={[
                    { value: "", label: "—" },
                    { value: "si", label: "Sí" },
                    { value: "no", label: "No" },
                  ]}
                />
                <BoxSelect
                  label="Ventana"
                  value={row.ventana}
                  onChange={(e) => updateAmbiente(row.id, { ventana: e.target.value })}
                  options={[
                    { value: "", label: "—" },
                    { value: "si", label: "Sí" },
                    { value: "no", label: "No" },
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() => removeAmbiente(row.id)}
                className="text-ink/40 hover:text-red-500 transition-colors text-lg leading-none px-1 pt-2"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addAmbiente}
          className="text-sm font-medium text-blue hover:underline"
        >
          + Agregar ambiente
        </button>
      </div>
    );
  }

  // 7) Render final
  return (
    <div className="grid lg:grid-cols-[minmax(0,640px)_360px] gap-8 items-start justify-center max-w-5xl mx-auto">
      <Card className="animate-fadeUp w-full">
        {/* Progreso */}
        <div className="flex items-center gap-2 mb-8">
          {pasos.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? "bg-orange" : "bg-navy-100"
              }`}
            />
          ))}
        </div>

        {/* Paso dinámico */}
        <div className="space-y-5">
          <h2 className="font-display font-semibold text-xl text-navy">{paso.nombre}</h2>
          {paso.descripcion && (
            <p className="text-sm text-ink/60 -mt-2">{paso.descripcion}</p>
          )}

          {paso.campos.map((campo) => renderCampo(campo))}

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="pt-2 flex justify-between">
            {stepIndex > 0 ? (
              <Button variant="ghost" onClick={() => setStepIndex(stepIndex - 1)}>
                ← Atrás
              </Button>
            ) : (
              <span />
            )}

            {stepIndex < pasos.length - 1 ? (
              <Button onClick={() => setStepIndex(stepIndex + 1)}>Siguiente →</Button>
            ) : (
              <Button onClick={handleSubmit} loading={enviando}>
                Confirmar y enviarme el presupuesto
              </Button>
            )}
          </div>
        </