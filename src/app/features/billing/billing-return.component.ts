import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subscription, timer } from 'rxjs';
import { SubscriptionService } from '../../shared/services/subscription.service';
import { PendingServiceOrder, ServiceOrderService } from '../../shared/services/service-order.service';
import { CurrentSubscription, PaymentHistoryItem } from '../../shared/models/subscription.model';
import { ServiceType } from '../../shared/models/service-order.model';

type ReturnState = 'pending' | 'success' | 'failed' | 'processing';
/** ЮKassa возвращает на один и тот же URL после подписки и после разовой услуги (SC-49). */
type ReturnMode = 'subscription' | 'service';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 10;

const SERVICE_TITLES: Record<ServiceType, string> = {
  ScoringReport: 'Скоринг-отчёт',
  TermSheet:     'Генерация term sheet',
  Promotion:     'Продвижение проекта',
};

@Component({
  selector: 'app-billing-return',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './billing-return.component.html',
  styleUrl: './billing-return.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingReturnComponent implements OnInit, OnDestroy {
  private readonly billing = inject(SubscriptionService);
  private readonly serviceOrders = inject(ServiceOrderService);
  private readonly title = inject(Title);

  readonly state = signal<ReturnState>('pending');
  readonly mode = signal<ReturnMode>('subscription');
  readonly serviceName = signal('');

  private attempts = 0;
  private pending: PendingServiceOrder | null = null;
  private pollSub?: Subscription;
  private timerSub?: Subscription;

  ngOnInit(): void {
    // Метку оставляет /plans перед редиректом на оплату услуги; её отсутствие = возврат с подписки.
    this.pending = this.serviceOrders.readPending();
    if (this.pending) {
      this.mode.set('service');
      this.serviceName.set(SERVICE_TITLES[this.pending.serviceType]);
      this.title.setTitle('Оплата услуги — DevStart');
    } else {
      this.title.setTitle('Оплата — DevStart');
    }

    this.poll();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  retry(): void {
    this.attempts = 0;
    this.state.set('pending');
    this.poll();
  }

  private poll(): void {
    // The payment result is settled server-side via the YooKassa webhook + reconciliation;
    // we poll until the payment (or the subscription) flips to its final state.
    this.pollSub?.unsubscribe();

    if (this.pending) {
      const paymentId = this.pending.paymentId;
      this.pollSub = this.billing.getPayments().subscribe({
        next: payments => this.evaluatePayment(payments.find(p => p.id === paymentId)),
        error: () => this.scheduleRetryOrGiveUp(),
      });
      return;
    }

    this.pollSub = this.billing.getCurrent().subscribe({
      next: sub => this.evaluate(sub),
      error: () => this.scheduleRetryOrGiveUp(),
    });
  }

  private evaluate(sub: CurrentSubscription): void {
    if (sub.isActivePro || sub.status === 'Active') {
      this.state.set('success');
      return;
    }
    if (sub.status === 'Cancelled' || sub.status === 'Expired') {
      this.state.set('failed');
      return;
    }
    this.scheduleRetryOrGiveUp();
  }

  /** Услуга активируется бэком по факту оплаты, поэтому статус платежа = статус услуги. */
  private evaluatePayment(payment: PaymentHistoryItem | undefined): void {
    if (payment?.status === 'Succeeded') {
      this.settle('success');
      return;
    }
    if (payment?.status === 'Failed' || payment?.status === 'Cancelled') {
      this.settle('failed');
      return;
    }
    this.scheduleRetryOrGiveUp();
  }

  private scheduleRetryOrGiveUp(): void {
    this.attempts += 1;
    if (this.attempts >= MAX_ATTEMPTS) {
      // Метку не стираем: «Обновить» на этом экране должно продолжать опрашивать тот же платёж.
      this.state.set('processing');
      return;
    }
    this.timerSub?.unsubscribe();
    this.timerSub = timer(POLL_INTERVAL_MS).subscribe(() => this.poll());
  }

  /** Терминальный статус услуги: метка больше не нужна и не должна пережить этот заход. */
  private settle(state: ReturnState): void {
    this.serviceOrders.clearPending();
    this.state.set(state);
  }
}
