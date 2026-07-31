import {
  ServiceCatalogItemDto,
  ServiceOrderDto,
  mapServiceCatalogDto,
  mapServiceOrderCheckoutDto,
  mapServiceOrderDto,
  serviceTypeCode,
} from './service-order.dto';

function item(serviceType: number, overrides: Partial<ServiceCatalogItemDto> = {}): ServiceCatalogItemDto {
  return {
    serviceType,
    price: 490,
    currency: 'RUB',
    description: 'Описание',
    accessDays: 30,
    targetKind: 1,
    ...overrides,
  };
}

function order(overrides: Partial<ServiceOrderDto> = {}): ServiceOrderDto {
  return {
    id: 'order-1',
    serviceType: 0,
    targetKind: 1,
    targetId: 'startup-1',
    targetName: 'Acme',
    amount: 490,
    currency: 'RUB',
    status: 2,
    isActive: true,
    createdAt: '2026-06-01T12:00:00Z',
    paidAt: '2026-06-01T12:01:00Z',
    fulfilledAt: '2026-06-01T12:01:00Z',
    expiresAt: '2026-07-01T12:01:00Z',
    ...overrides,
  };
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

  it('декодирует срок доступа и вид объекта, для которого покупается услуга', () => {
    const result = mapServiceCatalogDto([
      item(0, { accessDays: 30, targetKind: 1 }),
      item(1, { accessDays: 0, targetKind: 2 }),
    ]);

    expect(result[0].accessDays).toBe(30);
    expect(result[0].targetKind).toBe('Startup');
    expect(result[1].accessDays).toBe(0);
    expect(result[1].targetKind).toBe('Deal');
  });
});

describe('mapServiceOrderDto', () => {
  it('декодирует статус и вид объекта', () => {
    expect(mapServiceOrderDto(order({ status: 0 })).status).toBe('Pending');
    expect(mapServiceOrderDto(order({ status: 2 })).status).toBe('Fulfilled');
    expect(mapServiceOrderDto(order({ status: 4 })).status).toBe('Refunded');
    expect(mapServiceOrderDto(order()).targetKind).toBe('Startup');
  });

  it('оставляет заказ с неизвестным кодом услуги — это оплаченная история пользователя', () => {
    const result = mapServiceOrderDto(order({ serviceType: 99, status: 99 }));

    expect(result.id).toBe('order-1');
    expect(result.serviceType).toBe('ScoringReport');
    expect(result.status).toBe('Pending');
  });

  it('нормализует отсутствующие даты и объект в null', () => {
    const result = mapServiceOrderDto(order({ targetId: null, targetName: null, expiresAt: null }));

    expect(result.targetId).toBeNull();
    expect(result.targetName).toBeNull();
    expect(result.expiresAt).toBeNull();
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
