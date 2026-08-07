/** A file uploaded straight from the user's machine and attached to a chat message. */
export interface ChatFile {
  id: string;
  uploaderId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  presignedUrl: string;
  uploadDate: string;
}

export function isImageFile(file: ChatFile): boolean {
  return file.contentType.toLowerCase().startsWith('image/');
}

/** Mirrors the server-side allow-list (ChatFileRules). */
export const CHAT_FILE_ALLOWED_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/rtf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/csv',
  'text/markdown',
];

export const CHAT_FILE_MAX_SIZE_BYTES = 25 * 1024 * 1024;

/** `accept` attribute for the composer's file input — extensions, so the OS dialog filters sensibly. */
export const CHAT_FILE_ACCEPT =
  '.jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.rtf,.zip,.txt,.csv,.md';

const EXTENSION_ICON: Record<string, string> = {
  pdf: '📕',
  doc: '📘', docx: '📘', odt: '📘', rtf: '📘',
  xls: '📗', xlsx: '📗', csv: '📗', ods: '📗',
  ppt: '📙', pptx: '📙', odp: '📙',
  zip: '🗜️',
  txt: '📄', md: '📄',
  jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️', gif: '🖼️',
};

export function getChatFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_ICON[ext] ?? '📎';
}
