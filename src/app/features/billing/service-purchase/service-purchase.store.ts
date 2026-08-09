import { computed, inject } from '@angular/core';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, filter, forkJoin, of, pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';

import { ServiceOrderService } from '../../../shared/services/service-order.service';
import { StartupService } from '../../startups/startup.service';
import { InvestmentDealService } from '../../investors/investment-deal.service';
import { getStageBadgeLabel } from '../../../shared/utils/startup.utils';
import { formatRub } from '../../../shared/utils/format.utils';
import { Startup } from '../../../shared/models/startup.model';
import { InvestmentDeal } from '../../../shared/models/investment-deal.model';
import {
  ServiceCatalogItem,
  ServiceOrder,
  ServiceTarget,
  ServiceType,
} from '../../../shared/models/service-order.model';

interface ServicePurchaseState {
  catalog: ServiceCatalogItem[];
  /** Свои заказы — по ним видно, для каких объектов доступ уже оплачен. */
  orders: ServiceOrder[];
  startups: ServiceTarget[];
  deals: ServiceTarget[];
  catalogLoading: boolean;
  contextLoading: boolean;
  /** Профиль, под который загружены цели: смена пользователя обязана обновить списки. */
  loadedForUserId: string | null;
}

const initialState: ServicePurchaseState = {
  catalog: [],
  orders: [],
  startups: [],
  deals: [],
  catalogLoading: false,
  contextLoading: false,
  loadedForUserId: null,
};

const DEAL_STATUS_LABELS: Record<InvestmentDeal['status'], string> = {
  InProgress: 'В работе',
  Completed:  'Завершена',
  Cancelled:  'Отменена',
};

/**
 * Стартап → объект покупки. Экспортируется: карточка стартапа и «Мои стартапы» открывают
 * диалог с уже известной целью и собирают её из своей модели, а не ищут в списках стора.
 */
export function toStartupTarget(s: Startup): ServiceTarget {
  return {
    id: s.id,
    kind: 'Startup',
    name: s.name,
    avatarId: s.avatarId,
    meta: getStageBadgeLabel(s.stage, s.isStopped),
    inactive: s.isStopped,
  };
}

function toDealTarget(d: InvestmentDeal): ServiceTarget {
  return {
    id: d.id,
    kind: 'Deal',
    // У сделки нет своего имени — узнаётся она по проекту, в который вложились.
    name: d.startupName,
    avatarId: null,
    meta: `${formatRub(d.amount)} · ${DEAL_STATUS_LABELS[d.status] ?? d.status}`,
    inactive: d.status === 'Cancelled',
  };
}

/**
 * Данные, общие для всех точек входа в покупку разовой услуги (SC-49): каталог, свои заказы и
 * объекты, для которых услугу можно купить. Провайдится в корне и живёт между переходами —
 * диалог открывается из четырёх мест, и каждое из них не должно заново дёргать три эндпоинта.
 */
export const ServicePurchaseStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(store => ({
    /** Активные доступы: ключ `услуга|объект` (для услуг без объекта — `услуга|`). */
    activeAccess: computed(() => {
      const map = new Map<string, ServiceOrder>();
      for (const order of store.orders()) {
        if (order.isActive) map.set(`${order.serviceType}|${order.targetId ?? ''}`, order);
      }
      return map;
    }),
  })),

  withMethods((
    store,
    serviceSvc = inject(ServiceOrderService),
    startupSvc = inject(StartupService),
    dealSvc    = inject(InvestmentDealService),
  ) => ({
    /** Каталог доступен анонимно — цены видно до входа. Грузим один раз за сессию. */
    loadCatalog: rxMethod<void>(
      pipe(
        filter(() => store.catalog().length === 0 && !store.catalogLoading()),
        tap(() => patchState(store, { catalogLoading: true })),
        switchMap(() => serviceSvc.getCatalog().pipe(
          tapResponse({
            // Пустой каталог — рабочее состояние: секция услуг просто не показывается.
            next: (catalog: ServiceCatalogItem[]) => patchState(store, { catalog, catalogLoading: false }),
            error: () => patchState(store, { catalogLoading: false }),
          })
        )),
      )
    ),

    /**
     * Заказы и объекты покупки текущего пользователя. Каждый поток гасит свою ошибку:
     * недоступные сделки не должны лишать пользователя выбора среди своих стартапов.
     */
    loadContext: rxMethod<string>(
      pipe(
        filter(userId => !!userId && userId !== store.loadedForUserId() && !store.contextLoading()),
        tap(() => patchState(store, { contextLoading: true })),
        switchMap(userId => forkJoin({
          orders:   serviceSvc.getMine().pipe(catchError(() => of([] as ServiceOrder[]))),
          startups: startupSvc.getStartupsByProfile(userId).pipe(catchError(() => of([] as Startup[]))),
          deals:    dealSvc.getByInvestor(userId).pipe(catchError(() => of([] as InvestmentDeal[]))),
        }).pipe(
          tap(({ orders, startups, deals }) => patchState(store, {
            orders,
            startups: startups.map(toStartupTarget),
            deals: deals.map(toDealTarget),
            contextLoading: false,
            loadedForUserId: userId,
          })),
          catchError(() => {
            patchState(store, { contextLoading: false });
            return of(null);
          }),
        )),
      )
    ),

    /** Сбрасывает кэш целей — вызывается при смене пользователя (вход/выход). */
    reset(): void {
      patchState(store, { orders: [], startups: [], deals: [], loadedForUserId: null });
    },

    /** Цели нужного вида: услуга привязана либо к стартапу, либо к сделке. */
    targetsOf(kind: ServiceTarget['kind']): ServiceTarget[] {
      return kind === 'Deal' ? store.deals() : store.startups();
    },

    itemOf(serviceType: ServiceType): ServiceCatalogItem | null {
      return store.catalog().find(i => i.serviceType === serviceType) ?? null;
    },

    /** Оплаченный и действующий доступ к услуге для объекта, если он есть. */
    accessFor(serviceType: ServiceType, targetId: string | null): ServiceOrder | null {
      return store.activeAccess().get(`${serviceType}|${targetId ?? ''}`) ?? null;
    },
  })),
);
