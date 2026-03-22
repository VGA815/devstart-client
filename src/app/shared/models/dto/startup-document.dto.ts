import { StartupDocument, DocumentType } from '../startup-document.model';

const TYPE_MAP: Record<number, DocumentType> = {
  0: 'Pitch',
  1: 'Report',
  2: 'Other',
};

export const DOC_TYPE_NUM: Record<DocumentType, number> = {
  Pitch: 0, Report: 1, Other: 2,
};

export interface StartupDocumentDto {
  id: string;
  startupId: string;
  uploaderId: string;
  presignedUrl: string;
  documentType: number; // 0=Pitch, 1=Report, 2=Other
  fileSize: number;
  documentName: string;
  uploadDate: string;
}

export function mapStartupDocumentDto(dto: StartupDocumentDto): StartupDocument {
  return {
    id: dto.id,
    startupId: dto.startupId,
    uploaderId: dto.uploaderId,
    presignedUrl: dto.presignedUrl,
    documentType: TYPE_MAP[dto.documentType] ?? 'Other',
    fileSize: dto.fileSize,
    documentName: dto.documentName,
    uploadDate: dto.uploadDate,
  };
}
