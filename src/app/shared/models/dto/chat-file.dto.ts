import { ChatFile } from '../chat-file.model';

export interface ChatFileDto {
  id: string;
  uploaderId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  presignedUrl: string;
  uploadDate: string;
}

export function mapChatFileDto(dto: ChatFileDto): ChatFile {
  return {
    id: dto.id,
    uploaderId: dto.uploaderId,
    fileName: dto.fileName,
    contentType: dto.contentType,
    fileSize: dto.fileSize,
    presignedUrl: dto.presignedUrl,
    uploadDate: dto.uploadDate,
  };
}
