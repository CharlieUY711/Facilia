import type { SupabaseClient } from "@supabase/supabase-js";
import { Document } from "../../domain/entities/Document";
import { DocumentFilters, DocumentRepository } from "../../domain/repositories/DocumentRepository";
import { DocumentMapper, LibraryDocumentRow } from "../mappers/DocumentMapper";
import { DocumentNotFoundError } from "../../domain/errors/LibraryErrors";

const TABLE = "library_documents";
const DEFAULT_PAGE_SIZE = 25;

export class SupabaseDocumentRepository implements DocumentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(document: Document): Promise<void> {
    const fileName = `${document.id}.${document.metadata.extension}`;
    const row = DocumentMapper.toRow(document, fileName);
    const { error } = await this.client.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Error al guardar documento: ${error.message}`);
  }

  async findById(id: string): Promise<Document | null> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(`Error al buscar documento: ${error.message}`);
    if (!data) return null;
    return DocumentMapper.toDomain(data as LibraryDocumentRow);
  }

  async findMany(filters: DocumentFilters): Promise<{ items: Document[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from(TABLE)
      .select("*", { count: "exact" })
      .eq("organization_id", filters.organizationId)
      .eq("status", filters.status ?? "ACTIVE")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.repositoryType) {
      query = query.eq("repository_type", filters.repositoryType.toString());
    }
    if (filters.folderId !== undefined) {
      query = filters.folderId === null ? query.is("folder_id", null) : query.eq("folder_id", filters.folderId);
    }
    if (filters.extension) {
      query = query.eq("extension", filters.extension);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Error al listar documentos: ${error.message}`);
    return {
      items: (data ?? []).map((row) => DocumentMapper.toDomain(row as LibraryDocumentRow)),
      total: count ?? 0,
    };
  }

  async search(query: string, filters: DocumentFilters): Promise<{ items: Document[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let dbQuery = this.client
      .from(TABLE)
      .select("*", { count: "exact" })
      .eq("organization_id", filters.organizationId)
      .eq("status", filters.status ?? "ACTIVE")
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,original_name.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.repositoryType) {
      dbQuery = dbQuery.eq("repository_type", filters.repositoryType.toString());
    }
    if (filters.folderId !== undefined && filters.folderId !== null) {
      dbQuery = dbQuery.eq("folder_id", filters.folderId);
    }

    const { data, error, count } = await dbQuery;
    if (error) throw new Error(`Error al buscar documentos: ${error.message}`);
    return {
      items: (data ?? []).map((row) => DocumentMapper.toDomain(row as LibraryDocumentRow)),
      total: count ?? 0,
    };
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new DocumentNotFoundError(id);
    const { error } = await this.client
      .from(TABLE)
      .update({ status: "DELETED", deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`Error al eliminar documento: ${error.message}`);
  }
}
