import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupFollowersService } from '../../startups/startup-followers.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Startup } from '../../../shared/models/startup.model';
import { CurrentSubscription } from '../../../shared/models/subscription.model';
import { getStageColor } from '../../../shared/utils/startup.utils';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [RouterLink, AvatarComponent, SkeletonComponent],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubscriptionsComponent implements OnInit {
  private readonly auth          = inject(AuthService);
  private readonly followersSvc  = inject(StartupFollowersService);
  private readonly billingSvc    = inject(SubscriptionService);

  readonly loading    = signal(true);
  readonly subscriptionLoading = signal(true);
  readonly startups   = signal<Startup[]>([]);
  readonly subscription = signal<CurrentSubscription | null>(null);
  readonly subscriptionError = signal('');
  readonly unfollowing = signal<Set<string>>(new Set());

  constructor() { inject(Title).setTitle('Подписка — DevStart'); }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) {
      this.loading.set(false);
      this.subscriptionLoading.set(false);
      return;
    }

    this.followersSvc.getFollowedStartups(user.id)
      .pipe(catchError(() => of([] as Startup[])))
      .subscribe(list => {
        this.startups.set(list);
        this.loading.set(false);
      });

    this.loadSubscription();
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

  unfollow(startup: Startup): void {
    this.unfollowing.update(s => new Set([...s, startup.id]));
    this.startups.update(list => list.filter(s => s.id !== startup.id));

    this.followersSvc.unfollow(startup.id).subscribe({
      error: () => {
        this.startups.update(list => [startup, ...list]);
        this.unfollowing.update(s => { s.delete(startup.id); return new Set(s); });
      },
      complete: () => {
        this.unfollowing.update(s => { s.delete(startup.id); return new Set(s); });
      },
    });
  }

  readonly skeletons = [1, 2, 3];

  formatSubscriptionDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  }

  statusLabel(subscription: CurrentSubscription | null): string {
    if (!subscription?.status) return 'Free';
    const map: Record<string, string> = {
      Pending: 'Ожидает оплаты',
      Active: 'Активна',
      Cancelled: 'Отменена',
      Expired: 'Истекла',
    };
    return map[subscription.status] ?? subscription.status;
  }

  protected readonly getStageColor  = getStageColor;
}
