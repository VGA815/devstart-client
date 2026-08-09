import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { ServiceOrderService } from '../../../shared/services/service-order.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import {
  SERVICE_ORDER_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  ServiceOrder,
} from '../../../shared/models/service-order.model';
import { ServicePurchaseFacade } from '../../billing/service-purchase/service-purchase.facade';

@Component({
  selector: 'app-service-orders',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './service-orders.component.html',
  styleUrl: './service-orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceOrdersComponent implements OnInit {
  private readonly serviceSvc = inject(ServiceOrderService);
  private readonly purchase   = inject(ServicePurchaseFacade);

  readonly orders = signal<ServiceOrder[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() { inject(Title).setTitle('Разовые услуги — DevStart'); }

  /** Диалог покупки с нуля: сначала услуга, затем объект. */
  buyService(): void {
    this.purchase.open();
  }

  ngOnInit(): void {
    this.serviceSvc.getMine().pipe(
      catchError(() => {
        this.error.set('Не удалось загрузить заказы.');
        return of([] as ServiceOrder[]);
      })
    ).subscribe(orders => {
      this.orders.set(orders);
      this.loading.set(false);
    });
  }

  serviceLabel(order: ServiceOrder): string {
    return SERVICE_TYPE_LABELS[order.serviceType];
  }

  statusLabel(order: ServiceOrder): string {
    return SERVICE_ORDER_STATUS_LABELS[order.status];
  }

  /** Зелёный — доступ действует сейчас; жёлтый — ждём оплату; красный — заказ закрыт. */
  statusClass(order: ServiceOrder): string {
    if (order.isActive) return 'badge--green';
    if (order.status === 'Pending') return 'badge--yellow';
    if (order.status === 'Cancelled' || order.status === 'Refunded') return 'badge--red';
    return '';
  }

  /** Ссылка на объект услуги: у стартапа есть карточка, у сделки — страница в кабинете. */
  targetLink(order: ServiceOrder): unknown[] | null {
    if (!order.targetId) return null;
    return order.targetKind === 'Deal'
      ? ['/dashboard/investments/deals', order.targetId]
      : ['/startups', order.targetId];
  }

  targetText(order: ServiceOrder): string {
    return order.targetName ?? (order.targetKind === 'Deal' ? 'Сделка' : '—');
  }

  accessText(order: ServiceOrder): string {
    if (order.status !== 'Fulfilled') return '—';
    if (!order.expiresAt) return 'Бессрочно';
    return order.isActive
      ? `До ${this.formatDate(order.expiresAt)}`
      : `Истёк ${this.formatDate(order.expiresAt)}`;
  }

  formatAmount(order: ServiceOrder): string {
    const amount = new Intl.NumberFormat('ru-RU').format(order.amount);
    return `${amount} ${order.currency === 'RUB' ? '₽' : order.currency}`;
  }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }
}
