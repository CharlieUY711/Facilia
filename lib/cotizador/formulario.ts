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

export type FormularioResponse = {
  ok: boolean;
  pasos: Paso[];
  error?: string;
};

export async function fetchFormulario(): Promise<FormularioResponse> {
  const res = await fetch("/api/cotizador/formulario");
  const data = await res.json();
  return data;
}
