import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { ServiceCatalogItemDto, ServiceOrderDto } from '../../../shared/models/dto/service-order.dto';
import { ServiceTarget } from '../../../shared/models/service-order.model';
import { ServicePurchaseFacade, checkoutErrorMessage } from './service-purchase.facade';

const USER_ID = '11111111-1111-1111-1111-111111111111';

// Каталог бэка: enum'ы приходят числами (0 ScoringReport / 1 TermSheet / 2 Promotion),
// targetKind — 0 None / 1 Startup / 2 Deal.
const CATALOG: ServiceCatalogItemDto[] = [
  { serviceType: 0, price: 490,  currency: 'RUB', description: null, accessDays: 30, targetKind: 1 },
  { serviceType: 1, price: 1490, currency: 'RUB', description: null, accessDays: 0,  targetKind: 2 },
  { serviceType: 2, price: 990,  currency: 'RUB', description: null, accessDays: 14, targetKind: 1 },
];

function startupDto(id: string, name: string, isStopped = false): Record<string, unknown> {
  return {
    id, name, publicEmail: 'a@b.c', shortDescription: null, description: null, url: null,
    isStopped, stage: 2, socialMediaLinks: null, location: null, billingEmail: null,
    avatarId: null, tam: null, sam: null, som: null, hasPatents: false, marketGrowthRate: null,
    industry: 0, targetRoundAmount: null,
  };
}

function orderDto(overrides: Partial<ServiceOrderDto> = {}): ServiceOrderDto {
  return {
    id: 'order-1', serviceType: 0, targetKind: 1, targetId: 'startup-1', targetName: 'Alpha',
    amount: 490, currency: 'RUB', status: 2, isActive: true,
    createdAt: '2026-07-01T10:00:00Z', paidAt: '2026-07-01T10:01:00Z',
    fulfilledAt: '2026-07-01T10:01:00Z', expiresAt: '2026-08-01T10:01:00Z',
    ...overrides,
  };
}

function target(id: string, name: string, inactive = false): ServiceTarget {
  return { id, kind: 'Startup', name, avatarId: null, meta: 'MVP', inactive };
}

describe('ServicePurchaseFacade', () => {
  let facade: ServicePurchaseFacade;
  let http: HttpTestingController;
  const user = signal<{ id: string } | null>({ id: USER_ID });

  /** Отдаёт все четыре ответа, которые фасад запрашивает при `ensureLoaded()`. */
  function flushContext(orders: ServiceOrderDto[] = []): void {
    http.expectOne(`${environment.apiUrl}/service-orders/catalog`).flush(CATALOG);
    http.expectOne(`${environment.apiUrl}/service-orders`).flush(orders);
    http.expectOne(r => r.url === `${environment.apiUrl}/startups/users`).flush([
      startupDto('startup-1', 'Alpha'),
      startupDto('startup-2', 'Beta'),
      startupDto('startup-3', 'Gamma Stopped', true),
    ]);
    http.expectOne(`${environment.apiUrl}/investor-profiles/${USER_ID}/investment-deals`).flush([]);
  }

  beforeEach(() => {
    user.set({ id: USER_ID });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { user } },
      ],
    });

    facade = TestBed.inject(ServicePurchaseFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('открывает диалог сразу на выборе объекта, когда услуга задана точкой входа', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext();

    expect(facade.isOpen()).toBeTrue();
    expect(facade.step()).toBe('target');
    // Услуга пришла снаружи — возвращаться с шага объекта некуда.
    expect(facade.canGoBack()).toBeFalse();
  });

  it('пропускает оба шага выбора, когда заданы и услуга, и объект', () => {
    facade.open({ serviceType: 'ScoringReport', target: target('startup-1', 'Alpha') });
    flushContext();

    expect(facade.step()).toBe('confirm');
    expect(facade.canGoBack()).toBeFalse();
    expect(facade.target()?.id).toBe('startup-1');
  });

  it('сужает список услуг до подходящих объекту, заданному точкой входа', () => {
    facade.open({ target: target('startup-1', 'Alpha') });
    flushContext();

    expect(facade.step()).toBe('service');
    // Term sheet покупается для сделки — для стартапа его не предлагаем.
    expect(facade.serviceOptions().map(i => i.serviceType)).toEqual(['ScoringReport', 'Promotion']);
  });

  it('ведёт по всем трём шагам, когда точка входа не знает ничего', () => {
    facade.open();
    flushContext();

    expect(facade.step()).toBe('service');

    facade.pickService('ScoringReport');
    expect(facade.step()).toBe('target');
    expect(facade.canGoBack()).toBeTrue();

    facade.pickTarget(target('startup-2', 'Beta'));
    facade.toConfirm();
    expect(facade.step()).toBe('confirm');

    facade.back();
    expect(facade.step()).toBe('target');
  });

  it('переходит с услуги без объекта сразу к подтверждению', () => {
    facade.open();
    // Каталог только из услуги без объекта: шага выбора для неё нет.
    http.expectOne(`${environment.apiUrl}/service-orders/catalog`).flush([
      { serviceType: 2, price: 990, currency: 'RUB', description: null, accessDays: 14, targetKind: 0 },
    ]);
    http.expectOne(`${environment.apiUrl}/service-orders`).flush([]);
    http.expectOne(r => r.url === `${environment.apiUrl}/startups/users`).flush([]);
    http.expectOne(`${environment.apiUrl}/investor-profiles/${USER_ID}/investment-deals`).flush([]);

    facade.pickService('Promotion');

    expect(facade.step()).toBe('confirm');
    expect(facade.canPay()).toBeTrue();
  });

  it('помечает объекты с действующим доступом и не даёт выбрать их повторно', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext([orderDto({ targetId: 'startup-1', isActive: true })]);

    const rows = facade.rows();
    const alpha = rows.find(r => r.target.id === 'startup-1')!;

    expect(alpha.access?.expiresAt).toBe('2026-08-01T10:01:00Z');

    facade.pickTarget(alpha.target);
    expect(facade.canProceed()).toBeFalse();
  });

  it('не считает доступом истёкший или неоплаченный заказ', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext([orderDto({ targetId: 'startup-1', isActive: false })]);

    const alpha = facade.rows().find(r => r.target.id === 'startup-1')!;

    expect(alpha.access).toBeNull();
    facade.pickTarget(alpha.target);
    expect(facade.canProceed()).toBeTrue();
  });

  it('не даёт купить услугу для остановленного проекта', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext();

    const stopped = facade.rows().find(r => r.target.id === 'startup-3')!;
    expect(stopped.target.inactive).toBeTrue();

    facade.pickTarget(stopped.target);
    expect(facade.canProceed()).toBeFalse();
  });

  it('поднимает доступные объекты над купленными и остановленными', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext([orderDto({ targetId: 'startup-1', isActive: true })]);

    // Beta свободна, Alpha уже оплачена, Gamma остановлена.
    expect(facade.rows().map(r => r.target.id)).toEqual(['startup-2', 'startup-1', 'startup-3']);
  });

  it('фильтрует список поиском по названию', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext();

    facade.setQuery('bet');
    expect(facade.rows().map(r => r.target.name)).toEqual(['Beta']);

    facade.setQuery('  ');
    expect(facade.rows().length).toBe(3);
  });

  it('показывает поиск только на длинных списках', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext();

    expect(facade.showSearch()).toBeFalse();
  });

  it('блокирует оплату, когда доступ к выбранной паре уже оплачен', () => {
    facade.open({ serviceType: 'ScoringReport', target: target('startup-1', 'Alpha') });
    flushContext([orderDto({ targetId: 'startup-1', isActive: true })]);

    expect(facade.step()).toBe('confirm');
    expect(facade.alreadyOwned()).not.toBeNull();
    expect(facade.canPay()).toBeFalse();
  });

  it('сбрасывает выбор и ошибку при повторном открытии', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext();

    facade.pickTarget(target('startup-2', 'Beta'));
    facade.setQuery('bet');

    facade.open({ serviceType: 'Promotion' });

    expect(facade.target()).toBeNull();
    expect(facade.query()).toBe('');
    expect(facade.error()).toBe('');
  });

  it('уводит анонимного пользователя на вход вместо открытия диалога', () => {
    user.set(null);

    facade.open({ serviceType: 'ScoringReport' });

    expect(facade.isOpen()).toBeFalse();
  });

  it('заводит заказ на выбранный объект и запоминает платёж перед редиректом', () => {
    facade.open({ serviceType: 'ScoringReport', target: target('startup-2', 'Beta') });
    flushContext();

    // Редирект на ЮKassa в тесте не выполняем — проверяем сам запрос чекаута.
    const redirect = spyOn(facade as unknown as { redirectTo(url: string): void }, 'redirectTo');
    facade.pay();

    const req = http.expectOne(`${environment.apiUrl}/service-orders/checkout`);
    expect(req.request.body).toEqual({ serviceType: 0, targetId: 'startup-2' });
    req.flush({ serviceOrderId: 'o-1', paymentId: 'p-1', confirmationUrl: 'https://pay.example/1' });

    expect(redirect).toHaveBeenCalledWith('https://pay.example/1');
    expect(sessionStorage.getItem('devstart_pending_service_order'))
      .toBe(JSON.stringify({ paymentId: 'p-1', serviceType: 'ScoringReport' }));
    sessionStorage.clear();
  });

  it('показывает читаемое сообщение по коду Problem Details', () => {
    facade.open({ serviceType: 'ScoringReport', target: target('startup-2', 'Beta') });
    flushContext();

    facade.pay();
    http.expectOne(`${environment.apiUrl}/service-orders/checkout`).flush(
      { title: 'ServiceOrders.AlreadyOwned' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(facade.error()).toBe('Доступ уже оплачен и действует — второй раз платить не нужно.');
    expect(facade.busy()).toBeFalse();
  });

  it('переживает недоступность сделок: свои стартапы всё равно предлагаются', () => {
    facade.open({ serviceType: 'ScoringReport' });

    http.expectOne(`${environment.apiUrl}/service-orders/catalog`).flush(CATALOG);
    http.expectOne(`${environment.apiUrl}/service-orders`).flush([]);
    http.expectOne(r => r.url === `${environment.apiUrl}/startups/users`)
      .flush([startupDto('startup-1', 'Alpha')]);
    http.expectOne(`${environment.apiUrl}/investor-profiles/${USER_ID}/investment-deals`)
      .flush({ title: 'Investors.ProfileNotFound' }, { status: 404, statusText: 'Not Found' });

    expect(facade.rows().map(r => r.target.name)).toEqual(['Alpha']);
  });

  it('не перезапрашивает каталог и объекты на повторных открытиях', () => {
    facade.open({ serviceType: 'ScoringReport' });
    flushContext();

    facade.close();
    facade.open({ serviceType: 'Promotion' });

    // http.verify() в afterEach упадёт, если уйдёт хоть один лишний запрос.
    expect(facade.serviceOptions().length).toBe(3);
  });
});

describe('checkoutErrorMessage', () => {
  it('переводит известные коды ошибок бэка', () => {
    expect(checkoutErrorMessage('ServiceOrders.TargetNotAllowed'))
      .toBe('Эту услугу можно купить только для своего проекта или своей сделки.');
    expect(checkoutErrorMessage('Payments.CustomerEmailMissing'))
      .toBe('Для оплаты нужен подтверждённый email в профиле.');
  });

  it('даёт общий текст на незнакомый код и на его отсутствие', () => {
    const fallback = 'Не удалось открыть оплату. Попробуйте ещё раз.';

    expect(checkoutErrorMessage('Something.Unexpected')).toBe(fallback);
    expect(checkoutErrorMessage(undefined)).toBe(fallback);
  });
});
