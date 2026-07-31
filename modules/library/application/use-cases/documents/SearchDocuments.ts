import { DocumentRepository } from "../../../domain/repositories/DocumentRepository";
import { RepositoryType } from "../../../domain/value-objects/RepositoryType";
import { DocumentMapper } from "../../../infrastructure/mappers/DocumentMapper";
import { DocumentDTO } from "../../dto/DocumentDTO";

export interface SearchDocumentsInput {
  organizationId: string;
  query: string;
  repositoryType?: string;
  folderId?: string | null;
  page?: number;
  pageSize?: number;
}

export class SearchDocuments {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(input: SearchDocumentsInput): Promise<{ items: DocumentDTO[]; total: number }> {
    if (!input.query?.trim()) {
      throw new Error("La consulta de busqueda no puede estar vacia");
    }
    const { items, total } = await this.documentRepository.search(input.query.trim(), {
      organizationId: input.organizationId,
      repositoryType: input.repositoryType ? RepositoryType.fromString(input.repositoryType) : undefined,
      folderId: input.folderId,
      page: input.page,
      pageSize: input.pageSize,
    });
    return { items: items.map((d) => DocumentMapper.toDTO(d)), total };
  }
}
