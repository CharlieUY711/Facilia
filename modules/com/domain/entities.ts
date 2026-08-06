// Entidades de dominio del módulo COM — Communications Hub.
//
// Se mantienen en snake_case porque es el mismo criterio que ya usa
// lib/library/types.ts: estos tipos son un espejo 1:1 de las filas de
// Postgres, no un modelo de dominio "rico" con mapeo intermedio. El
// desacople real de Twilio no está en el naming de los campos sino en
// los puertos (ver ./ports/*): el dominio nunca importa nada de
// infrastructure/twilio.

export type ComChannel = "whatsapp";
export type ComConversationEstado = "abierta" | "cerrada" | "archivada";
export type ComMessageDireccion = "saliente" | "entrante";
export type ComMessageTipo = "texto" | "imagen" | "documento" | "ubicacion" | "sistema";
export type ComMessageEstadoEntrega = "creado" | "enviado" | "entregado" | "leido" | "fallido";
export type ComDeliveryEstado = "sent" | "delivered" | "read" | "failed" | "undelivered";
export type ComTemplateCategoria =
  | "TASK_ASSIGNMENT"
  | "TASK_REMINDER"
  | "TASK_CONFIRMATION"
  | "TASK_REJECTION"
  | "EVIDENCE_REQUEST"
  | "INCIDENT_NOTIFICATION"
  | "SERVICE_COMPLETED";
export type ComRuleEstado = "activa" | "inactiva" | "borrador";

export interface Conversation {
  id: string;
  organizacion_id: string | null;
  persona_id: string;
  work_order_id: string | null;
  channel: ComChannel;
  estado: ComConversationEstado;
  iniciada_at: string;
  cerrada_at: string | null;
  created_by: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  direccion: ComMessageDireccion;
  tipo: ComMessageTipo;
  contenido: string | null;
  proveedor: string;
  external_message_id: string | null;
  estado_entrega: ComMessageEstadoEntrega;
  enviado_por: string | null;
  regla_id: string | null;
  created_at: string;
}

export interface DeliveryRecord {
  id: string;
  message_id: string;
  proveedor: string;
  estado: ComDeliveryEstado;
  error_code: string | null;
  raw_payload: unknown;
  created_at: string;
}

export interface CommunicationTemplate {
  id: string;
  nombre: string;
  codigo: string;
  categoria: ComTemplateCategoria;
  contenido: string;
  variables: string[];
  idioma: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunicationRule {
  id: string;
  nombre: string;
  evento: string;
  template_id: string;
  condiciones: Record<string, unknown>;
  estado: ComRuleEstado;
  orden: number;
  created_at: string;
}

export interface EvidenceReference {
  id: string;
  message_id: string;
  library_document_id: string;
  work_order_id: string | null;
  created_at: string;
}

export interface OperationalIssue {
  id: string;
  conversation_id: string;
  message_id: string | null;
  work_order_id: string | null;
  persona_id: string;
  descripcion: string;
  estado: "abierto" | "en_revision" | "resuelto" | "cerrado";
  created_at: string;
  resuelto_at: string | null;
}

export interface OperationalRequest {
  id: string;
  conversation_id: string;
  tipo: "insumo" | "herramienta" | "soporte" | "acceso" | "otro";
  descripcion: string;
  prioridad: "baja" | "media" | "alta";
  persona_id: string;
  estado: "pendiente" | "en_curso" | "resuelta";
  created_at: string;
}

export interface CommunicationPreference {
  persona_id: string;
  whatsapp_habilitado: boolean;
  telefono_whatsapp: string | null;
  horario_desde: string | null;
  horario_hasta: string | null;
}

/** Referencia mínima a una Persona (Directory) — solo lectura desde COM. */
export interface PersonaRef {
  id: string;
  organizacion_id: string | null;
  nombre: string;
  telefono: string | null;
}
