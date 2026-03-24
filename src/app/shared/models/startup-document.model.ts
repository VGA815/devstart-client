export type DocumentType = 'Pitch' | 'Report' | 'Other';

export interface StartupDocument {
  id: string;
  startupId: string;
  uploaderId: string;
  presignedUrl: string;
  documentType: DocumentType;
  fileSize: number;
  documentName: string;
  uploadDate: string;
}
