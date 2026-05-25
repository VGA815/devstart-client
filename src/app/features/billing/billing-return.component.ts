import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subscription, timer } from 'rxjs';
import { SubscriptionService } from '../../shared/services/subscription.service';
import { CurrentSubscription } from '../../shared/models/subscription.model';

type ReturnState = 'pending' | 'success' | 'failed' | 'processing';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 10;

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
  private readonly title = inject(Title);

  readonly state = signal<ReturnState>('pending');

  private attempts = 0;
  private pollSub?: Subscription;
  private timerSub?: Subscription;

  ngOnInit(): void {
    this.title.setTitle('Оплата — DevStart');
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
    // we poll the subscription status until it flips to Active (or we give up gracefully).
    this.pollSub?.unsubscribe();
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

  private scheduleRetryOrGiveUp(): void {
    this.attempts += 1;
    if (this.attempts >= MAX_ATTEMPTS) {
      this.state.set('processing');
      return;
    }
    this.timerSub?.unsubscribe();
    this.timerSub = timer(POLL_INTERVAL_MS).subscribe(() => this.poll());
  }
}
