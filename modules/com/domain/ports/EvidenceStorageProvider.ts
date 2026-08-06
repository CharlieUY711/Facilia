// Puerto para la futura integración con Library (COM-04).
//
// COM-02 NO descarga ni almacena archivos de Twilio: solo detecta que
// llegó multimedia y delega en este puerto. La implementación real
// (subir a Library, crear el library_document y el com_evidence_reference)
// se hace en COM-04 — acá dejamos la interfaz y un adaptador "noop" que
// deja constancia de que la evidencia llegó pero todavía no se persistió.

export interface SaveEvidenceReferenceInput {
  messageId: string;
  conversationId: string;
  workOrderId: string | null;
  /** URL temporal del medio en el proveedor (ej. Twilio Media URL, expira). */
  providerMediaUrl: string;
  mimeType?: string | null;
}

export interface SaveEvidenceReferenceResult {
  /** false en el adaptador noop de COM-02: todavía no hay library_document real. */
  stored: boolean;
  libraryDocumentId?: string;
  reason?: string;
}

export interface EvidenceStorageProvider {
  saveEvidenceReference(input: SaveEvidenceReferenceInput): Promise<SaveEvidenceReferenceResult>;
}
