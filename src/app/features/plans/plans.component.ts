import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SubscriptionService } from '../../shared/services/subscription.service';
import { ServiceOrderService } from '../../shared/services/service-order.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { CurrentSubscription } from '../../shared/models/subscription.model';
import { StartupService } from '../startups/startup.service';
import { InvestmentDealService } from '../investors/investment-deal.service';
import { ServiceCatalogItem, ServiceType } from '../../shared/models/service-order.model';

/** Вариант выбора объекта, для которого покупается услуга. */
export interface ServiceTargetOption {
  id: string;
  name: string;
}

/** Витринные подписи разовых услуг. Цена и валюта — только из каталога бэка. */
const SERVICE_META: Record<ServiceType, { title: string; desc: string }> = {
  ScoringReport: {
    title: 'Скоринг-отчёт',
    desc: 'Разовый расчёт скоринга и ориентира диапазона стоимости по данным проекта — без подписки.',
  },
  TermSheet: {
    title: 'Генерация term sheet',
    desc: 'Документ с предлагаемыми условиями сделки на основе профиля стартапа и скоринга.',
  },
  Promotion: {
    title: 'Продвижение проекта',
    desc: 'Приоритетное размещение карточки стартапа в каталоге платформы.',
  },
};

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly billingSvc = inject(SubscriptionService);
  private readonly serviceSvc = inject(ServiceOrderService);
  private readonly startupSvc = inject(StartupService);
  private readonly dealSvc = inject(InvestmentDealService);
  private readonly router = inject(Router);
  private readonly titleSvc = inject(Title);
  private readonly metaSvc = inject(Meta);

  readonly subscriptionLoading = signal(false);
  readonly checkoutLoading = signal(false);
  readonly subscription = signal<CurrentSubscription | null>(null);
  readonly subscriptionError = signal('');
  readonly checkoutError = signal('');
  readonly promoCode = signal('');

  // SC-49: разовые услуги
  readonly services = signal<ServiceCatalogItem[]>([]);
  readonly servicesLoading = signal(false);
  /** Тип услуги, по которой сейчас открывается оплата (блокирует только её кнопку). */
  readonly serviceBusy = signal<ServiceType | null>(null);
  readonly serviceError = signal('');

  /** Объекты, для которых можно купить услугу: свои стартапы и свои сделки (как инвестор). */
  readonly myStartups = signal<ServiceTargetOption[]>([]);
  readonly myDeals = signal<ServiceTargetOption[]>([]);
  readonly targetsLoading = signal(false);
  /** Выбранная цель по каждой услуге. */
  readonly selectedTarget = signal<Partial<Record<ServiceType, string>>>({});

  readonly proFeatures = [
    'Скоринг DevStart по ключевым осям проекта',
    'Расчётный ориентир диапазона стоимости стартапа',
    'Премиальные метрики: MRR, MAU, MoM Growth, LTV',
    'Быстрый переход к расширенной аналитике в карточках стартапов',
  ];

  readonly freeFeatures = [
    'Каталог стартапов, инвесторов и экспертов',
    'Публичные карточки проектов',
    'Подписка на обновления стартапов',
    'Базовые заявки и коммуникация',
  ];

  ngOnInit(): void {
    this.titleSvc.setTitle('Планы — DevStart');
    this.metaSvc.updateTag({
      name: 'description',
      content: 'Планы DevStart: Free для базовой работы и Pro для расширенной аналитики стартапов.',
    });

    if (this.auth.user()) {
      this.loadSubscription();
      this.loadTargets();
    }

    this.loadServices();
  }

  checkout(): void {
    if (!this.auth.user()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.checkoutLoading()) return;

    this.checkoutLoading.set(true);
    this.checkoutError.set('');

    const promoCode = this.promoCode().trim() || undefined;

    this.billingSvc.checkout(promoCode).subscribe({
      next: session => {
        if (session.confirmationUrl) {
          window.location.assign(session.confirmationUrl);
          return;
        }
        // A free promo activated the subscription without a payment redirect —
        // the return page confirms the Active status and shows the success state.
        if (session.activated) {
          this.router.navigate(['/billing/return']);
          return;
        }
        this.checkoutLoading.set(false);
        this.checkoutError.set('Не удалось открыть оплату. Попробуйте ещё раз.');
      },
      error: (err) => {
        this.checkoutLoading.set(false);
        this.checkoutError.set(checkoutErrorMessage(err?.error?.title));
        this.loadSubscription();
      },
    });
  }

  /** Варианты выбора для карточки услуги: свои стартапы, свои сделки либо ничего. */
  targetOptions(item: ServiceCatalogItem): ServiceTargetOption[] {
    if (item.targetKind === 'Startup') return this.myStartups();
    if (item.targetKind === 'Deal') return this.myDeals();
    return [];
  }

  targetLabel(item: ServiceCatalogItem): string {
    return item.targetKind === 'Deal' ? 'Сделка' : 'Стартап';
  }

  targetOf(item: ServiceCatalogItem): string {
    return this.selectedTarget()[item.serviceType] ?? '';
  }

  onTargetChange(item: ServiceCatalogItem, value: string): void {
    this.selectedTarget.update(current => ({ ...current, [item.serviceType]: value }));
    this.serviceError.set('');
  }

  /** Кнопка активна, только когда услуге есть что покупать: цель выбрана либо не требуется. */
  canBuy(item: ServiceCatalogItem): boolean {
    if (this.serviceBusy() !== null) return false;
    if (!this.auth.user()) return true;
    return item.targetKind === 'None' || this.targetOf(item) !== '';
  }

  /** Срок доступа в человекочитаемом виде; 0 в каталоге означает бессрочно. */
  accessLabel(item: ServiceCatalogItem): string {
    return item.accessDays > 0 ? `Доступ на ${item.accessDays} дн.` : 'Бессрочно';
  }

  /** Заводит заказ разовой услуги и уводит на оплату ЮKassa. */
  buyService(item: ServiceCatalogItem): void {
    if (!this.auth.user()) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.serviceBusy()) return;

    const targetId = item.targetKind === 'None' ? null : this.targetOf(item);
    if (item.targetKind !== 'None' && !targetId) {
      this.serviceError.set(`Выберите, для чего покупается услуга (${this.targetLabel(item).toLowerCase()}).`);
      return;
    }

    this.serviceBusy.set(item.serviceType);
    this.serviceError.set('');

    this.serviceSvc.checkout(item.serviceType, targetId).subscribe({
      next: order => {
        if (order.confirmationUrl) {
          // Страница возврата у подписки и услуг одна — оставляем метку, чем закончился заход.
          this.serviceSvc.rememberPending(order.paymentId, item.serviceType);
          window.location.assign(order.confirmationUrl);
          return;
        }
        this.serviceBusy.set(null);
        this.serviceError.set('Не удалось открыть оплату. Попробуйте ещё раз.');
      },
      error: err => {
        this.serviceBusy.set(null);
        this.serviceError.set(checkoutErrorMessage(err?.error?.title));
      },
    });
  }

  serviceTitle(item: ServiceCatalogItem): string {
    return SERVICE_META[item.serviceType].title;
  }

  serviceDesc(item: ServiceCatalogItem): string {
    return SERVICE_META[item.serviceType].desc;
  }

  formatPrice(item: ServiceCatalogItem): string {
    const amount = new Intl.NumberFormat('ru-RU').format(item.price);
    return `${amount} ${item.currency === 'RUB' ? '₽' : item.currency}`;
  }

  /**
   * Подтягивает объекты для выбора. Скоринг-отчёт на чужой стартап покупается с карточки этого
   * стартапа — здесь предлагаем только свои, иначе список был бы во весь каталог платформы.
   */
  private loadTargets(): void {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.targetsLoading.set(true);

    this.startupSvc.getStartupsByProfile(userId).pipe(
      catchError(() => of([]))
    ).subscribe(startups => {
      this.myStartups.set(startups.map(s => ({ id: s.id, name: s.name })));
      this.targetsLoading.set(false);
    });

    this.dealSvc.getByInvestor(userId).pipe(
      catchError(() => of([]))
    ).subscribe(deals => {
      this.myDeals.set(deals.map(d => ({ id: d.id, name: d.startupName })));
    });
  }

  private loadServices(): void {
    this.servicesLoading.set(true);

    // Каталог пустой или недоступный — секцию просто не показываем: подписка не должна страдать.
    this.serviceSvc.getCatalog().pipe(
      catchError(() => of([] as ServiceCatalogItem[]))
    ).subscribe(items => {
      this.services.set(items);
      this.servicesLoading.set(false);
    });
  }

  private loadSubscription(): void {
    this.subscriptionLoading.set(true);
    this.subscriptionError.set('');

    this.billingSvc.getCurrent().pipe(
      catchError(() => {
        this.subscriptionError.set('Не удалось загрузить статус подписки.');
        return of(null);
      })
    ).subscribe(subscription => {
      this.subscription.set(subscription);
      this.subscriptionLoading.set(false);
    });
  }

  formatSubscriptionDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  }
}

// Ветвимся по `title` из Problem Details — это стабильный код ошибки, в отличие от detail.
const CHECKOUT_ERRORS: Record<string, string> = {
  'PromoCodes.InvalidCode':          'Промокод недействителен.',
  'PromoCodes.Inactive':             'Промокод больше не активен.',
  'PromoCodes.NotYetValid':          'Промокод ещё не начал действовать.',
  'PromoCodes.Expired':              'Срок действия промокода истёк.',
  'PromoCodes.GlobalLimitReached':   'Лимит использований промокода исчерпан.',
  'PromoCodes.AlreadyRedeemedByUser':'Вы уже использовали этот промокод.',
  'PromoCodes.PlanMismatch':         'Промокод не подходит для этого плана.',
  // SC-42: достигнут годовой лимит дохода НПД — новые платные операции недоступны до конца года.
  'Payments.IncomeLimitReached':     'Приём оплат временно приостановлен до конца календарного года. ' +
                                     'Напишите в поддержку — подскажем, когда оплата снова откроется.',
  'Payments.CustomerEmailMissing':   'Для оплаты нужен подтверждённый email в профиле.',
  'Payments.ProviderUnavailable':    'Платёжный сервис временно недоступен. Попробуйте позже.',
  'ServiceOrders.UnknownServiceType':'Эта услуга сейчас недоступна.',
  // SC-49: услуга покупается для конкретного объекта, и не для любого.
  'ServiceOrders.TargetRequired':    'Выберите, для чего покупается услуга.',
  'ServiceOrders.TargetNotFound':    'Объект не найден или недоступен.',
  'ServiceOrders.TargetNotAllowed':  'Эту услугу можно купить только для своего проекта или своей сделки.',
  'ServiceOrders.AlreadyOwned':      'Доступ уже оплачен и действует — второй раз платить не нужно.',
};

function checkoutErrorMessage(title?: string): string {
  return (title && CHECKOUT_ERRORS[title]) ?? 'Не удалось открыть оплату. Попробуйте ещё раз.';
}
