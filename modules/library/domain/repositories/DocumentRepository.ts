import { Document } from "../entities/Document";
import { RepositoryType } from "../value-objects/RepositoryType";

export interface DocumentFilters {
  organizationId: string;
  repositoryType?: RepositoryType;
  folderId?: string | null;
  search?: string;
  extension?: string;
  status?: "ACTIVE" | "DELETED";
  page?: number;
  pageSize?: number;
}

export interface DocumentRepository {
  save(document: Document): Promise<void>;
  findById(id: string): Promise<Document | null>;
  findMany(filters: DocumentFilters): Promise<{ items: Document[]; total: number }>;
  search(query: string, filters: DocumentFilters): Promise<{ items: Document[]; total: number }>;
  delete(id: string): Promise<void>;
}
