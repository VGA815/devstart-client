import {
  ServiceCatalogItemDto,
  mapServiceCatalogDto,
  mapServiceOrderCheckoutDto,
  serviceTypeCode,
} from './service-order.dto';

function item(serviceType: number, overrides: Partial<ServiceCatalogItemDto> = {}): ServiceCatalogItemDto {
  return { serviceType, price: 490, currency: 'RUB', description: 'Описание', ...overrides };
}

describe('mapServiceCatalogDto', () => {
  it('декодирует коды услуг бэкенд-энума', () => {
    const result = mapServiceCatalogDto([item(0), item(1), item(2)]);

    expect(result.map(i => i.serviceType)).toEqual(['ScoringReport', 'TermSheet', 'Promotion']);
  });

  it('отбрасывает позицию с неизвестным кодом — купить её всё равно нельзя', () => {
    const result = mapServiceCatalogDto([item(0), item(99)]);

    expect(result.length).toBe(1);
    expect(result[0].serviceType).toBe('ScoringReport');
  });

  it('нормализует null в валюте и описании', () => {
    const result = mapServiceCatalogDto([item(0, { currency: null, description: null })]);

    expect(result[0].currency).toBe('RUB');
    expect(result[0].description).toBe('');
  });
});

describe('serviceTypeCode', () => {
  it('отдаёт число для тела запроса чекаута', () => {
    expect(serviceTypeCode('ScoringReport')).toBe(0);
    expect(serviceTypeCode('TermSheet')).toBe(1);
    expect(serviceTypeCode('Promotion')).toBe(2);
  });
});

describe('mapServiceOrderCheckoutDto', () => {
  it('нормализует отсутствующую ссылку на оплату в null', () => {
    const result = mapServiceOrderCheckoutDto({
      serviceOrderId: 'order-1', paymentId: 'pay-1', confirmationUrl: null,
    });

    expect(result.confirmationUrl).toBeNull();
    expect(result.paymentId).toBe('pay-1');
  });
});
