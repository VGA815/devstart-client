import { PartnershipKind } from '../startup-partnership.model';
import { StartupPartnershipDto, mapStartupPartnershipDto } from './startup-partnership.dto';

function dto(overrides: Partial<StartupPartnershipDto> = {}): StartupPartnershipDto {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    startupId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    partnerName: 'Big Retailer',
    website: 'https://retailer.example',
    kind: 2,
    description: 'Продают наш продукт в 40 точках с мая.',
    isWorkedOut: true,
    createdAt: '2026-08-22T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
    ...overrides,
  };
}

describe('mapStartupPartnershipDto', () => {
  it('декодирует kind из числа в enum', () => {
    expect(mapStartupPartnershipDto(dto({ kind: 0 })).kind).toBe(PartnershipKind.Pilot);
    expect(mapStartupPartnershipDto(dto({ kind: 2 })).kind).toBe(PartnershipKind.Distribution);
    expect(mapStartupPartnershipDto(dto({ kind: 7 })).kind).toBe(PartnershipKind.Other);
  });

  it('нормализует отсутствующее описание в null', () => {
    expect(mapStartupPartnershipDto(dto({ description: null })).description).toBeNull();
  });

  /**
   * `isWorkedOut` берётся с сервера, а не выводится из описания: это драйвер оценки, и клиент,
   * угадавший правило иначе, объяснял бы оценку неверно. Тест фиксирует именно это — флаг едет
   * как есть, даже если он расходится с тем, что подсказал бы текст описания.
   */
  it('берёт isWorkedOut с сервера, а не выводит его из описания', () => {
    expect(mapStartupPartnershipDto(dto({ description: null, isWorkedOut: true })).isWorkedOut).toBeTrue();
    expect(mapStartupPartnershipDto(dto({ description: 'есть текст', isWorkedOut: false })).isWorkedOut).toBeFalse();
  });

  it('считает запись непроработанной, если флага в ответе нет', () => {
    const partial = { ...dto() } as Partial<StartupPartnershipDto>;
    delete partial.isWorkedOut;

    expect(mapStartupPartnershipDto(partial as StartupPartnershipDto).isWorkedOut).toBeFalse();
  });
});
