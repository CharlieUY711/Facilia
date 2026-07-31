import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseDocumentRepository } from "../../infrastructure/supabase/SupabaseDocumentRepository";
import { SupabaseFolderRepository } from "../../infrastructure/supabase/SupabaseFolderRepository";
import { SupabaseStorageRepository } from "../../infrastructure/supabase/SupabaseStorageRepository";
import { SupabaseDocumentLinkRepository } from "../../infrastructure/supabase/SupabaseDocumentLinkRepository";

import { CreateFolder } from "../../application/use-cases/folders/CreateFolder";
import { RenameFolder } from "../../application/use-cases/folders/RenameFolder";
import { DeleteFolder } from "../../application/use-cases/folders/DeleteFolder";
import { ListFolders } from "../../application/use-cases/folders/ListFolders";

import { UploadDocument } from "../../application/use-cases/documents/UploadDocument";
import { GetDocument } from "../../application/use-cases/documents/GetDocument";
import { ListDocuments } from "../../application/use-cases/documents/ListDocuments";
import { SearchDocuments } from "../../application/use-cases/documents/SearchDocuments";
import { MoveDocument } from "../../application/use-cases/documents/MoveDocument";
import { DeleteDocument } from "../../application/use-cases/documents/DeleteDocument";
import { DownloadDocument } from "../../application/use-cases/documents/DownloadDocument";
import { LinkDocument } from "../../application/use-cases/documents/LinkDocument";
import { UnlinkDocument } from "../../application/use-cases/documents/UnlinkDocument";

/**
 * Container liviano de casos de uso del modulo Library.
 * Los endpoints NUNCA acceden a los repositorios Supabase directamente:
 * siempre obtienen un caso de uso desde aqui.
 */
export function buildLibraryContainer(supabase: SupabaseClient) {
  const documentRepository = new SupabaseDocumentRepository(supabase);
  const folderRepository = new SupabaseFolderRepository(supabase);
  const storageRepository = new SupabaseStorageRepository(supabase);
  const documentLinkRepository = new SupabaseDocumentLinkRepository(supabase);

  return {
    folders: {
      createFolder: new CreateFolder(folderRepository),
      renameFolder: new RenameFolder(folderRepository),
      deleteFolder: new DeleteFolder(folderRepository),
      listFolders: new ListFolders(folderRepository),
    },
    documents: {
      uploadDocument: new UploadDocument(documentRepository, storageRepository, folderRepository),
      getDocument: new GetDocument(documentRepository),
      listDocuments: new ListDocuments(documentRepository),
      searchDocuments: new SearchDocuments(documentRepository),
      moveDocument: new MoveDocument(documentRepository, folderRepository),
      deleteDocument: new DeleteDocument(documentRepository),
      downloadDocument: new DownloadDocument(documentRepository, storageRepository),
      linkDocument: new LinkDocument(documentRepository, documentLinkRepository),
      unlinkDocument: new UnlinkDocument(documentLinkRepository),
    },
  };
}
