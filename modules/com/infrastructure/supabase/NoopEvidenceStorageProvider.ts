import type {
  EvidenceStorageProvider,
  SaveEvidenceReferenceInput,
  SaveEvidenceReferenceResult,
} from "../../domain/ports/EvidenceStorageProvider";

/**
 * Implementación "noop" del puerto EvidenceStorageProvider.
 *
 * COM-02 detecta que llegó multimedia (imagen/documento) en un mensaje
 * entrante, pero NO lo descarga ni lo guarda — eso es responsabilidad
 * de COM-04, que va a subirlo a Library y recién ahí crear la fila en
 * com_evidence_references (que exige un library_document_id real, no
 * puede quedar en null). Este adaptador solo deja constancia en logs
 * de que la evidencia llegó y está pendiente de persistir.
 */
export class NoopEvidenceStorageProvider implements EvidenceStorageProvider {
  async saveEvidenceReference(input: SaveEvidenceReferenceInput): Promise<SaveEvidenceReferenceResult> {
    // eslint-disable-next-line no-console
    console.warn(
      `[com] evidencia recibida en message ${input.messageId} (conversation ${input.conversationId}) ` +
        `pendiente de persistir en Library — implementar en COM-04. URL proveedor: ${input.providerMediaUrl}`
    );
    return { stored: false, reason: "Integración con Library pendiente (COM-04)." };
  }
}
