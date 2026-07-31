export class LibraryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LibraryDomainError";
  }
}

export class InvalidFileMetadataError extends LibraryDomainError {
  constructor(reason: string) {
    super(`Metadato de archivo invalido: ${reason}`);
    this.name = "InvalidFileMetadataError";
  }
}

export class DocumentNotFoundError extends LibraryDomainError {
  constructor(id: string) {
    super(`Documento no encontrado: ${id}`);
    this.name = "DocumentNotFoundError";
  }
}

export class FolderNotFoundError extends LibraryDomainError {
  constructor(id: string) {
    super(`Carpeta no encontrada: ${id}`);
    this.name = "FolderNotFoundError";
  }
}

export class InvalidRepositoryTypeError extends LibraryDomainError {
  constructor(value: string) {
    super(`Tipo de repositorio invalido: ${value}`);
    this.name = "InvalidRepositoryTypeError";
  }
}

export class OrganizationMismatchError extends LibraryDomainError {
  constructor() {
    super("La organizacion del recurso no coincide con la organizacion del solicitante");
    this.name = "OrganizationMismatchError";
  }
}
