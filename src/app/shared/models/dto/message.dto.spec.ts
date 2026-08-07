import { ChatParticipant } from '../message.model';
import { MessageDto, mapMessageDto } from './message.dto';

function dto(overrides: Partial<MessageDto> = {}): MessageDto {
  return {
    id: 'm1',
    senderId: 'u1',
    senderType: ChatParticipant.User,
    receiverId: 'u2',
    receiverType: ChatParticipant.User,
    textContent: 'Привет',
    mediaIds: [],
    metricIds: [],
    documentIds: [],
    fileIds: [],
    isRead: false,
    createdAt: '2026-08-07T10:00:00Z',
    updatedAt: '2026-08-07T10:00:00Z',
    ...overrides,
  };
}

describe('mapMessageDto', () => {
  it('сохраняет все четыре вида вложений', () => {
    const result = mapMessageDto(dto({
      mediaIds: ['media-1'],
      metricIds: ['metric-1'],
      documentIds: ['doc-1', 'doc-2'],
      fileIds: ['file-1'],
    }));

    expect(result.mediaIds).toEqual(['media-1']);
    expect(result.metricIds).toEqual(['metric-1']);
    expect(result.documentIds).toEqual(['doc-1', 'doc-2']);
    expect(result.fileIds).toEqual(['file-1']);
  });

  it('нормализует отсутствующие списки вложений в пустые массивы', () => {
    const partial = {
      ...dto(),
      mediaIds: undefined,
      metricIds: undefined,
      documentIds: undefined,
      fileIds: undefined,
    } as unknown as MessageDto;

    const result = mapMessageDto(partial);

    expect(result.mediaIds).toEqual([]);
    expect(result.metricIds).toEqual([]);
    expect(result.documentIds).toEqual([]);
    expect(result.fileIds).toEqual([]);
  });
});
