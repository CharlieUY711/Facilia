export interface DocumentDTO {
  id: string;
  organizationId: string;
  repositoryType: "PUBLIC" | "PRIVATE";
  folderId: string | null;
  fileName: string;
  originalName: string;
  extension: string;
  mimeType: string;
  fileSize: number;
  title: string;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  status: "ACTIVE" | "DELETED";
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
