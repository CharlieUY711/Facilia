import { randomUUID } from "crypto";
import { Document } from "../../../domain/entities/Document";
import { DocumentRepository } from "../../../domain/repositories/DocumentRepository";
import { StorageRepository } from "../../../domain/repositories/StorageRepository";
import { FolderRepository } from "../../../domain/repositories/FolderRepository";
import { RepositoryType } from "../../../domain/value-objects/RepositoryType";
import { Visibility } from "../../../domain/value-objects/Visibility";
import { FileMetadata } from "../../../domain/value-objects/FileMetadata";
import { StorageLocation } from "../../../domain/value-objects/StorageLocation";
import { OrganizationMismatchError } from "../../../domain/errors/LibraryErrors";
import { DocumentMapper } from "../../../infrastructure/mappers/DocumentMapper";
import { DocumentDTO } from "../../dto/DocumentDTO";

export interface UploadDocumentInput {
  organizationId: string;
  repositoryType: string;
  folderId: string | null;
  file: Buffer;
  originalName: string;
  extension: string;
  mimeType: string;
  fileSize: number;
  title?: string;
  description?: string | null;
  visibility: string;
  userId: string;
}

export class UploadDocument {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storageRepository: StorageRepository,
    private readonly folderRepository: FolderRepository
  ) {}

  async execute(input: UploadDocumentInput): Promise<DocumentDTO> {
    if (input.folderId) {
      const folder = await this.folderRepository.findById(input.folderId);
      if (!folder) throw new Error("La carpeta destino no existe");
      if (folder.organizationId !== input.organizationId) throw new OrganizationMismatchError();
    }

    const documentId = randomUUID();
    const repositoryType = RepositoryType.fromString(input.repositoryType);
    const metadata = FileMetadata.create({
      originalName: input.originalName,
      extension: input.extension,
      mimeType: input.mimeType,
      sizeInBytes: input.fileSize,
    });

    const storageLocation = StorageLocation.buildPath({
      organizationId: input.organizationId,
      repositoryType,
      folderId: input.folderId,
      documentId,
      extension: metadata.extension,
    });

    await this.storageRepository.upload(storageLocation, input.file, metadata.mimeType);

    const document = Document.create({
      id: documentId,
      organizationId: input.organizationId,
      repositoryType,
      folderId: input.folderId,
      storageLocation,
      metadata,
      title: input.title,
      description: input.description,
      visibility: Visibility.fromString(input.visibility),
      createdBy: input.userId,
    });

    try {
      await this.documentRepository.save(document);
    } catch (err) {
      // Compensacion: si falla la persistencia, se elimina el archivo ya subido.
      await this.storageRepository.delete(storageLocation).catch(() => undefined);
      throw err;
    }

    return DocumentMapper.toDTO(document);
  }
}
