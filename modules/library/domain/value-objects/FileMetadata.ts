import { InvalidFileMetadataError } from "../errors/LibraryErrors";

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB, ajustable por configuracion futura

export interface FileMetadataProps {
  originalName: string;
  extension: string;
  mimeType: string;
  sizeInBytes: number;
}

export class FileMetadata {
  private constructor(
    public readonly originalName: string,
    public readonly extension: string,
    public readonly mimeType: string,
    public readonly sizeInBytes: number
  ) {}

  static create(props: FileMetadataProps): FileMetadata {
    const originalName = props.originalName?.trim();
    if (!originalName) {
      throw new InvalidFileMetadataError("el nombre original es requerido");
    }
    const extension = props.extension?.trim().toLowerCase().replace(/^\./, "");
    if (!extension) {
      throw new InvalidFileMetadataError("la extension es requerida");
    }
    if (!props.mimeType?.trim()) {
      throw new InvalidFileMetadataError("el tipo MIME es requerido");
    }
    if (!Number.isFinite(props.sizeInBytes) || props.sizeInBytes <= 0) {
      throw new InvalidFileMetadataError("el tamano debe ser mayor a cero");
    }
    if (props.sizeInBytes > MAX_FILE_SIZE_BYTES) {
      throw new InvalidFileMetadataError(
        `el tamano supera el maximo permitido (${MAX_FILE_SIZE_BYTES} bytes)`
      );
    }
    return new FileMetadata(originalName, extension, props.mimeType.trim(), props.sizeInBytes);
  }
}
