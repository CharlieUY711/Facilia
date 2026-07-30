type CampoOpcionDTO = { value: string; label: string };

type CampoDTO = {
  id: string;
  paso_id: string;
  nombre: string;
  codigo: string;
  tipo_input: "select" | "number" | "text" | "boolean" | "select_repetible";
  obligatorio: boolean;
  orden: number;
  activo: boolean;
  opciones: CampoOpcionDTO[]; // ya resueltas: jsonb o join a cotizador_opciones
  variable_id?: string | null;
};

type PasoFormularioDTO = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  campos: CampoDTO[];
};

type FormularioDTO = {
  pasos: PasoFormularioDTO[];
};
