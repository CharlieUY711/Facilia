export interface FolderDTO {
  id: string;
  organizationId: string;
  repositoryType: "PUBLIC" | "PRIVATE";
  parentFolderId: string | null;
  name: string;
  description: string | null;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
