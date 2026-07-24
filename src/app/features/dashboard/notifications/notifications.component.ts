import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CentrifugoService } from '../../../core/centrifugo.service';
import { NotificationService } from './notification.service';
import { Notification } from '../../../shared/models/notification.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { formatRelativeTime } from '../../../shared/utils/format.utils';
import {
  NotificationLink, getNotificationIcon, getNotificationLink,
} from '../../../shared/utils/notification.utils';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly auth      = inject(AuthService);
  private readonly svc       = inject(NotificationService);
  private readonly centrifugo = inject(CentrifugoService);
  private readonly router    = inject(Router);

  readonly loading       = signal(true);
  readonly saving        = signal(false);
  readonly notifications = signal<Notification[]>([]);

  readonly unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
  readonly hasUnread   = computed(() => this.unreadCount() > 0);

  private realtimeSub?: Subscription;

  constructor() { inject(Title).setTitle('Уведомления — DevStart'); }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }

    this.svc.getAll(1, 50).pipe(catchError(() => of([] as Notification[])))
      .subscribe(list => {
        this.notifications.set(list);
        this.loading.set(false);
      });

    this.centrifugo.connect(user.id).catch(() => { /* ignore */ });
    this.realtimeSub = this.centrifugo.notifications$.subscribe(n => {
      this.notifications.update(list => [n, ...list]);
    });
  }

  ngOnDestroy(): void {
    this.realtimeSub?.unsubscribe();
  }

  markRead(n: Notification): void {
    if (n.isRead) return;
    this.svc.markRead(n.id).subscribe({
      next: () => this.notifications.update(list =>
        list.map(item => item.id === n.id ? { ...item, isRead: true } : item)
      ),
    });
  }

  /**
   * Клик отмечает прочитанным и уводит к самой сущности. Переход не ждёт ответа
   * `markRead`: отметка — фоновая мелочь, задерживать из-за неё навигацию незачем.
   */
  open(n: Notification): void {
    this.markRead(n);

    const link = this.linkFor(n);
    if (!link) return;

    this.router.navigate(link.commands, link.queryParams ? { queryParams: link.queryParams } : {});
  }

  linkFor(n: Notification): NotificationLink | null {
    return getNotificationLink(n);
  }

  markAllRead(): void {
    if (!this.hasUnread() || this.saving()) return;
    this.saving.set(true);
    this.svc.markAllRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  protected readonly formatDate = formatRelativeTime;
  protected readonly getIcon    = getNotificationIcon;
}
