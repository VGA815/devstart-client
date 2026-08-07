import {
  CHAT_FILE_ALLOWED_TYPES, ChatFile, getChatFileIcon, isImageFile,
} from './chat-file.model';

function file(overrides: Partial<ChatFile> = {}): ChatFile {
  return {
    id: 'f1',
    uploaderId: 'u1',
    fileName: 'Питч.pdf',
    contentType: 'application/pdf',
    fileSize: 1024,
    presignedUrl: 'https://files.test/f1',
    uploadDate: '2026-08-07T10:00:00Z',
    ...overrides,
  };
}

describe('chat-file model', () => {
  it('распознаёт изображения по content type', () => {
    expect(isImageFile(file({ contentType: 'image/png' }))).toBeTrue();
    expect(isImageFile(file({ contentType: 'IMAGE/JPEG' }))).toBeTrue();
    expect(isImageFile(file())).toBeFalse();
  });

  it('подбирает иконку по расширению и не падает на файле без расширения', () => {
    expect(getChatFileIcon('Питч.pdf')).toBe('📕');
    expect(getChatFileIcon('модель.XLSX')).toBe('📗');
    expect(getChatFileIcon('README')).toBe('📎');
  });

  it('allow-list покрывает типы, которые предлагает диалог выбора файла', () => {
    expect(CHAT_FILE_ALLOWED_TYPES).toContain('application/pdf');
    expect(CHAT_FILE_ALLOWED_TYPES).toContain(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(CHAT_FILE_ALLOWED_TYPES).not.toContain('application/x-msdownload');
  });
});
