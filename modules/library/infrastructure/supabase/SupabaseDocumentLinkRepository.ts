import type { SupabaseClient } from "@supabase/supabase-js";
import { DocumentLinkRepository } from "../../domain/repositories/DocumentLinkRepository";
import { DocumentReference } from "../../domain/entities/DocumentReference";
import { EntityReference } from "../../domain/value-objects/EntityReference";

const TABLE = "library_document_links";

interface LinkRow {
  id: string;
  document_id: string;
  entity_type: string;
  entity_id: string;
  created_by: string;
  created_at: string;
}

function toDomain(row: LinkRow): DocumentReference {
  return DocumentReference.reconstitute({
    id: row.id,
    documentId: row.document_id,
    entityReference: EntityReference.create({ entityType: row.entity_type, entityId: row.entity_id }),
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  });
}

export class SupabaseDocumentLinkRepository implements DocumentLinkRepository {
  constructor(private readonly client: SupabaseClient) {}

  async link(reference: DocumentReference): Promise<void> {
    const props = reference.toProps();
    const { error } = await this.client.from(TABLE).upsert(
      {
        id: props.id,
        document_id: props.documentId,
        entity_type: props.entityReference.entityType,
        entity_id: props.entityReference.entityId,
        created_by: props.createdBy,
      },
      { onConflict: "document_id,entity_type,entity_id" }
    );
    if (error) throw new Error(`Error al vincular documento: ${error.message}`);
  }

  async unlink(documentId: string, entityReference: EntityReference): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .delete()
      .eq("document_id", documentId)
      .eq("entity_type", entityReference.entityType)
      .eq("entity_id", entityReference.entityId);
    if (error) throw new Error(`Error al desvincular documento: ${error.message}`);
  }

  async findByEntity(entityReference: EntityReference): Promise<DocumentReference[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("entity_type", entityReference.entityType)
      .eq("entity_id", entityReference.entityId);
    if (error) throw new Error(`Error al listar vinculos por entidad: ${error.message}`);
    return (data ?? []).map((row) => toDomain(row as LinkRow));
  }

  async findByDocument(documentId: string): Promise<DocumentReference[]> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("document_id", documentId);
    if (error) throw new Error(`Error al listar vinculos por documento: ${error.message}`);
    return (data ?? []).map((row) => toDomain(row as LinkRow));
  }
}
