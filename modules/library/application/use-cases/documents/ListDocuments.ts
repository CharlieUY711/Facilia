import { DocumentRepository } from "../../../domain/repositories/DocumentRepository";
import { RepositoryType } from "../../../domain/value-objects/RepositoryType";
import { DocumentMapper } from "../../../infrastructure/mappers/DocumentMapper";
import { DocumentDTO } from "../../dto/DocumentDTO";

export interface ListDocumentsInput {
  organizationId: string;
  repositoryType?: string;
  folderId?: string | null;
  extension?: string;
  page?: number;
  pageSize?: number;
}

export class ListDocuments {
  constructor(private readonly documentRepository: DocumentRepository) {}

  async execute(input: ListDocumentsInput): Promise<{ items: DocumentDTO[]; total: number }> {
    const { items, total } = await this.documentRepository.findMany({
      organizationId: input.organizationId,
      repositoryType: input.repositoryType ? RepositoryType.fromString(input.repositoryType) : undefined,
      folderId: input.folderId,
      extension: input.extension,
      page: input.page,
      pageSize: input.pageSize,
    });
    return { items: items.map((d) => DocumentMapper.toDTO(d)), total };
  }
}
