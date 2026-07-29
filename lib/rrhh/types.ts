// Tipos compartidos del módulo de Personal (RRHH) — usados tanto por
// las API routes (app/api/rrhh/**) como por los componentes
// (components/rrhh/**).

export type EstadoLaboral = "activo" | "inactivo" | "licencia";
export type TipoContrato = "indefinido" | "plazo_fijo" | "pasantia" | "honorarios" | "otro";

export type CategoriaDocumento = "empresa" | "personal";
export type EstadoDocumento = "vigente" | "pendiente_firma" | "pendiente_completar" | "anulado";

export type EstadoAsistencia = "presente" | "tarde" | "ausente" | "licencia";
export type EstadoTarea = "pendiente" | "en_curso" | "completada";

export interface RefMini {
  id: string;
  nombre: string;
}

// Persona con los campos legales del legajo (ver migración
// 2026_07_29_rrhh_modulo.sql — se agregan sobre la tabla personas que
// ya existía para el Directorio).
export interface PersonaLegajo {
  id: string;
  profile_id: string | null;
  organizacion_id: string | null;
  locacion_id: string | null;
  nombre: string;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  cargo: string | null;
  tipo: string;
  notas: string | null;
  created_at: string;
  organizaciones: RefMini | null;
  locaciones: RefMini | null;
  // Legal
  documento: string | null;
  fecha_nacimiento: string | null;
  fecha_ingreso: string | null;
  fecha_egreso: string | null;
  tipo_contrato: TipoContrato | null;
  salario: number | null;
  estado_laboral: EstadoLaboral;
}

export interface RrhhDocumento {
  id: string;
  persona_id: string;
  categoria: CategoriaDocumento;
  nombre: string;
  tipo: string | null;
  storage_path: string | null;
  estado: EstadoDocumento;
  vencimiento: string | null;
  notas: string | null;
  subido_por: string | null;
  created_at: string;
  resuelto_at: string | null;
}

export interface RrhhAsistencia {
  id: string;
  persona_id: string;
  fecha: string;
  estado: EstadoAsistencia;
  notas: string | null;
  created_at: string;
}

export interface RrhhHaber {
  id: string;
  persona_id: string;
  anio: number;
  mes: number;
  monto: number;
  detalle: Record<string, unknown>;
  pagado_at: string | null;
  created_at: string;
}

export interface RrhhTarea {
  id: string;
  persona_id: string;
  locacion_id: string | null;
  titulo: string;
  descripcion: string | null;
  fecha: string | null;
  estado: EstadoTarea;
  created_at: string;
  completada_at: string | null;
  locaciones: RefMini | null;
}

export interface RrhhComunicado {
  id: string;
  titulo: string;
  cuerpo: string;
  para_todos: boolean;
  persona_id: string | null;
  created_at: string;
  personas: RefMini | null;
  leido: boolean;
}

export const CATEGORIA_DOCUMENTO_LABEL: Record<CategoriaDocumento, string> = {
  empresa: "Documento de la empresa",
  personal: "Documento personal",
};

export const ESTADO_DOCUMENTO_LABEL: Record<EstadoDocumento, string> = {
  vigente: "Vigente",
  pendiente_firma: "Pendiente de firma",
  pendiente_completar: "Pendiente de completar",
  anulado: "Anulado",
};

export const ESTADO_ASISTENCIA_LABEL: Record<EstadoAsistencia, string> = {
  presente: "Presente",
  tarde: "Tarde",
  ausente: "Ausente",
  licencia: "Licencia",
};

export const ESTADO_TAREA_LABEL: Record<EstadoTarea, string> = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  completada: "Completada",
};

export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  indefinido: "Indefinido",
  plazo_fijo: "Plazo fijo",
  pasantia: "Pasantía",
  honorarios: "Honorarios",
  otro: "Otro",
};

export const ESTADO_LABORAL_LABEL: Record<EstadoLaboral, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  licencia: "Licencia",
};
