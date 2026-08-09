import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ServiceOrderService } from '../../../shared/services/service-order.service';
import {
  ServiceCatalogItem,
  ServiceOrder,
  ServiceTarget,
  ServiceType,
} from '../../../shared/models/service-order.model';
import { ServicePurchaseStore } from './service-purchase.store';

/** Шаги диалога. Лишние пропускаются: заданную снаружи услугу или цель заново не спрашиваем. */
export type PurchaseStep = 'service' | 'target' | 'confirm';

/** С чем открывают диалог из конкретной точки входа. */
export interface PurchaseRequest {
  /** Услуга известна заранее (карточка на /plans, кнопка в скоринге). */
  serviceType?: ServiceType;
  /** Объект известен заранее (карточка стартапа, шапка «Моих стартапов»). */
  target?: ServiceTarget;
}

/** Строка списка выбора: цель + уже оплаченный доступ к выбранной услуге, если он есть. */
export interface TargetRow {
  target: ServiceTarget;
  /** Доступ уже оплачен и действует — покупать второй раз нечего. */
  access: ServiceOrder | null;
}

/** Начиная с этого числа объектов список получает поле поиска. */
const SEARCH_THRESHOLD = 6;

// Ветвимся по `title` из Problem Details — стабильный код ошибки, в отличие от `detail`.
const CHECKOUT_ERRORS: Record<string, string> = {
  // SC-42: достигнут годовой лимит дохода НПД — новые платные операции недоступны до конца года.
  'Payments.IncomeLimitReached':      'Приём оплат временно приостановлен до конца календарного года. ' +
                                      'Напишите в поддержку — подскажем, когда оплата снова откроется.',
  'Payments.CustomerEmailMissing':    'Для оплаты нужен подтверждённый email в профиле.',
  'Payments.ProviderUnavailable':     'Платёжный сервис временно недоступен. Попробуйте позже.',
  'ServiceOrders.UnknownServiceType': 'Эта услуга сейчас недоступна.',
  // SC-49: услуга покупается для конкретного объекта, и не для любого.
  'ServiceOrders.TargetRequired':     'Выберите, для чего покупается услуга.',
  'ServiceOrders.TargetNotFound':     'Объект не найден или недоступен.',
  'ServiceOrders.TargetNotAllowed':   'Эту услугу можно купить только для своего проекта или своей сделки.',
  'ServiceOrders.AlreadyOwned':       'Доступ уже оплачен и действует — второй раз платить не нужно.',
};

export function checkoutErrorMessage(title?: string): string {
  return (title && CHECKOUT_ERRORS[title]) ?? 'Не удалось открыть оплату. Попробуйте ещё раз.';
}

/**
 * Единая точка покупки разовой услуги (SC-49). Диалог один на всё приложение и открывается
 * из четырёх мест, поэтому его состояние живёт здесь, а не в компоненте: точке входа достаточно
 * вызвать `open()` с тем, что она уже знает — услугой, объектом или ничем.
 */
@Injectable({ providedIn: 'root' })
export class ServicePurchaseFacade {
  private readonly store      = inject(ServicePurchaseStore);
  private readonly serviceSvc = inject(ServiceOrderService);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);

  // ── Состояние диалога ────────────────────────────────────────────────────────
  private readonly _open       = signal(false);
  private readonly _service    = signal<ServiceType | null>(null);
  /** Услуга задана снаружи ⇒ шага её выбора нет и «назад» с него не возвращается. */
  private readonly _serviceFixed = signal(false);
  private readonly _lockedTarget = signal<ServiceTarget | null>(null);
  private readonly _pickedId   = signal<string | null>(null);
  /** Пользователь дошёл до сводки заказа. */
  private readonly _confirming = signal(false);
  private readonly _query      = signal('');
  private readonly _busy       = signal(false);
  private readonly _error      = signal('');

  readonly isOpen  = this._open.asReadonly();
  readonly query   = this._query.asReadonly();
  readonly busy    = this._busy.asReadonly();
  readonly error   = this._error.asReadonly();
  readonly loading = computed(() => this.store.catalogLoading() || this.store.contextLoading());

  /** Каталог для витрины /plans — тот же источник, что и у диалога. */
  readonly catalog          = this.store.catalog;
  readonly catalogLoading   = this.store.catalogLoading;

  // ── Витрина ──────────────────────────────────────────────────────────────────

  /**
   * Подтягивает каталог и, для вошедшего пользователя, его заказы и объекты покупки.
   * Вызывается точками входа явно, а не в конструкторе: фасад провайдится в корне, и
   * фоновая загрузка трёх эндпоинтов на каждом экране, где он оказался внедрён, не нужна.
   * Повторные вызовы бесплатны — гарды в сторе отсекают уже загруженное.
   */
  ensureLoaded(): void {
    this.store.loadCatalog();

    const userId = this.auth.user()?.id;
    if (userId) this.store.loadContext(userId);
  }

  /** Услуги, которые есть смысл предлагать для заданного объекта. */
  servicesFor(kind: ServiceTarget['kind']): ServiceCatalogItem[] {
    return this.store.catalog().filter(item => item.targetKind === kind);
  }

  /** Активный доступ к услуге для объекта — используется и вне диалога (снять замок в UI). */
  accessFor(serviceType: ServiceType, targetId: string | null): ServiceOrder | null {
    return this.store.accessFor(serviceType, targetId);
  }

  // ── Производное состояние диалога ────────────────────────────────────────────

  readonly item = computed<ServiceCatalogItem | null>(() => {
    const type = this._service();
    return type ? this.store.itemOf(type) : null;
  });

  /**
   * Текущий шаг выводится, а не запоминается: вид объекта у услуги известен только из каталога,
   * а он может прийти уже после открытия диалога. Иначе клик по «Купить» на холодной странице
   * проскакивал выбор проекта и показывал пустую сводку заказа.
   */
  readonly step = computed<PurchaseStep>(() => {
    if (!this._service()) return 'service';
    if (this._confirming()) return 'confirm';
    return this.needsTargetStep() ? 'target' : 'confirm';
  });

  /** Каталог по выбранной услуге ещё не пришёл — показываем скелетоны вместо шага. */
  readonly pending = computed(() => !!this._service() && !this.item());

  /** Шаг «услуга»: доступные позиции каталога с учётом уже зафиксированного объекта. */
  readonly serviceOptions = computed<ServiceCatalogItem[]>(() => {
    const locked = this._lockedTarget();
    return locked ? this.servicesFor(locked.kind) : this.store.catalog();
  });

  /** Объект, для которого в итоге покупается услуга: зафиксированный снаружи либо выбранный. */
  readonly target = computed<ServiceTarget | null>(() => {
    const locked = this._lockedTarget();
    if (locked) return locked;

    const id = this._pickedId();
    if (!id) return null;

    const kind = this.item()?.targetKind;
    if (kind !== 'Startup' && kind !== 'Deal') return null;

    return this.store.targetsOf(kind).find(t => t.id === id) ?? null;
  });

  /** Все объекты нужного вида со статусом доступа — до фильтрации поиском. */
  readonly allRows = computed<TargetRow[]>(() => {
    const type = this._service();
    const kind = this.item()?.targetKind;
    if (!type || (kind !== 'Startup' && kind !== 'Deal')) return [];

    return this.store.targetsOf(kind).map(target => ({
      target,
      access: this.store.accessFor(type, target.id),
    }));
  });

  /** Строки шага выбора: поиск по названию, уже оплаченные и остановленные — вниз списка. */
  readonly rows = computed<TargetRow[]>(() => {
    const q = this._query().trim().toLowerCase();
    const rows = q
      ? this.allRows().filter(r => r.target.name.toLowerCase().includes(q))
      : [...this.allRows()];

    return rows.sort((a, b) => rank(a) - rank(b));
  });

  readonly showSearch = computed(() => this.allRows().length >= SEARCH_THRESHOLD);

  /** Доступ к выбранной паре «услуга + объект» уже оплачен — платить второй раз незачем. */
  readonly alreadyOwned = computed<ServiceOrder | null>(() => {
    const type = this._service();
    if (!type) return null;

    const kind = this.item()?.targetKind;
    if (kind === 'None') return this.store.accessFor(type, null);

    const target = this.target();
    return target ? this.store.accessFor(type, target.id) : null;
  });

  /** Кнопка «Далее» на шаге выбора объекта. */
  readonly canProceed = computed(() => {
    const row = this.allRows().find(r => r.target.id === this._pickedId());
    return !!row && !row.access && !row.target.inactive;
  });

  readonly canPay = computed(() => {
    if (this._busy() || !this.item() || this.alreadyOwned()) return false;
    return this.item()!.targetKind === 'None' || !!this.target();
  });

  /** С шага подтверждения можно вернуться, только если раньше был хотя бы один шаг выбора. */
  readonly canGoBack = computed(() => {
    if (this.step() === 'confirm') return this.needsTargetStep() || !this._serviceFixed();
    if (this.step() === 'target')  return !this._serviceFixed();
    return false;
  });

  // ── Команды ──────────────────────────────────────────────────────────────────

  /**
   * Открывает диалог. Анонимного пользователя уводим на вход: чекаут всё равно требует
   * подтверждённый email, и показывать ему список чужих объектов нечего.
   */
  open(request: PurchaseRequest = {}): void {
    if (!this.auth.user()) {
      this.router.navigate(['/login']);
      return;
    }

    this.ensureLoaded();

    this._service.set(request.serviceType ?? null);
    this._serviceFixed.set(!!request.serviceType);
    this._lockedTarget.set(request.target ?? null);
    this._pickedId.set(null);
    this._confirming.set(false);
    this._query.set('');
    this._error.set('');
    this._busy.set(false);
    this._open.set(true);
  }

  close(): void {
    this._open.set(false);
    this._busy.set(false);
  }

  pickService(serviceType: ServiceType): void {
    this._service.set(serviceType);
    this._pickedId.set(null);
    this._confirming.set(false);
    this._query.set('');
    this._error.set('');
  }

  pickTarget(target: ServiceTarget): void {
    this._pickedId.set(target.id);
    this._error.set('');
  }

  isPicked(target: ServiceTarget): boolean {
    return this._pickedId() === target.id;
  }

  setQuery(value: string): void {
    this._query.set(value);
  }

  toConfirm(): void {
    if (this.canProceed()) this._confirming.set(true);
  }

  back(): void {
    // С подтверждения возвращаемся на выбор объекта, если он вообще был; иначе — на выбор услуги.
    if (this.step() === 'confirm' && this.needsTargetStep()) {
      this._confirming.set(false);
      return;
    }
    if (!this._serviceFixed()) {
      this._pickedId.set(null);
      this._confirming.set(false);
      this._service.set(null);
    }
  }

  /** Заводит заказ и уводит на оплату ЮKassa. */
  pay(): void {
    const item = this.item();
    if (!item || this._busy()) return;

    const targetId = item.targetKind === 'None' ? null : (this.target()?.id ?? null);
    if (item.targetKind !== 'None' && !targetId) {
      this._error.set('Выберите, для чего покупается услуга.');
      return;
    }

    this._busy.set(true);
    this._error.set('');

    this.serviceSvc.checkout(item.serviceType, targetId).subscribe({
      next: order => {
        if (order.confirmationUrl) {
          // Страница возврата у подписки и услуг одна — оставляем метку, чем закончился заход.
          this.serviceSvc.rememberPending(order.paymentId, item.serviceType);
          this.redirectTo(order.confirmationUrl);
          return;
        }
        this._busy.set(false);
        this._error.set('Не удалось открыть оплату. Попробуйте ещё раз.');
      },
      error: err => {
        this._busy.set(false);
        this._error.set(checkoutErrorMessage(err?.error?.title));
      },
    });
  }

  // ── Внутреннее ───────────────────────────────────────────────────────────────

  /** Уход на страницу оплаты вынесен в метод: тест перехватывает его вместо реального перехода. */
  protected redirectTo(url: string): void {
    window.location.assign(url);
  }

  /** Шаг выбора объекта нужен, только если услуга к нему привязана и он не задан снаружи. */
  private needsTargetStep(): boolean {
    if (this._lockedTarget()) return false;

    const kind = this.item()?.targetKind;
    return kind === 'Startup' || kind === 'Deal';
  }
}

/** Порядок строк: доступные сверху, затем уже оплаченные, в самом низу остановленные проекты. */
function rank(row: TargetRow): number {
  if (row.target.inactive) return 2;
  if (row.access) return 1;
  return 0;
}
