// lib/cotizador/formulario.ts
export type CampoOpcion = { value: string; label: string };

export type Campo = {
  id: string;
  paso_id: string;
  nombre: string;
  codigo: string;
  tipo_input: "select" | "number" | "text" | "boolean" | "select_repetible";
  obligatorio: boolean;
  orden: number;
  activo: boolean;
  opciones: CampoOpcion[];
  variable_id?: string | null;
};

export type Paso = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  campos: Campo[];
};

export type Formulario = {
  pasos: Paso[];
};

export async function fetchFormulario(): Promise<Formulario> {
  const res = await fetch("/api/cotizador/formulario");
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "No se pudo cargar el formulario");
  return data;
}
