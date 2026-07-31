import type { SupabaseClient } from "@supabase/supabase-js";
import { Folder } from "../../domain/entities/Folder";
import { FolderRepository } from "../../domain/repositories/FolderRepository";
import { RepositoryType } from "../../domain/value-objects/RepositoryType";
import { FolderMapper, LibraryFolderRow } from "../mappers/FolderMapper";
import { FolderNotFoundError } from "../../domain/errors/LibraryErrors";

const TABLE = "library_folders";

export class SupabaseFolderRepository implements FolderRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(folder: Folder): Promise<void> {
    const row = FolderMapper.toRow(folder);
    const { error } = await this.client.from(TABLE).upsert(row, { onConflict: "id" });
    if (error) throw new Error(`Error al guardar carpeta: ${error.message}`);
  }

  async findById(id: string): Promise<Folder | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`Error al buscar carpeta: ${error.message}`);
    if (!data) return null;
    return FolderMapper.toDomain(data as LibraryFolderRow);
  }

  async findChildren(
    parentFolderId: string | null,
    organizationId: string,
    repositoryType: RepositoryType
  ): Promise<Folder[]> {
    let query = this.client
      .from(TABLE)
      .select("*")
      .eq("organization_id", organizationId)
      .eq("repository_type", repositoryType.toString())
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    query = parentFolderId ? query.eq("parent_folder_id", parentFolderId) : query.is("parent_folder_id", null);

    const { data, error } = await query;
    if (error) throw new Error(`Error al listar subcarpetas: ${error.message}`);
    return (data ?? []).map((row) => FolderMapper.toDomain(row as LibraryFolderRow));
  }

  async findTree(organizationId: string, repositoryType: RepositoryType): Promise<Folder[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("organization_id", organizationId)
      .eq("repository_type", repositoryType.toString())
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`Error al obtener arbol de carpetas: ${error.message}`);
    return (data ?? []).map((row) => FolderMapper.toDomain(row as LibraryFolderRow));
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new FolderNotFoundError(id);
    const { error } = await this.client
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`Error al eliminar carpeta: ${error.message}`);
  }
}
