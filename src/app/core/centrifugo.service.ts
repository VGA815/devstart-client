import { Injectable, inject, OnDestroy, isDevMode } from '@angular/core';
import { Observable, Subject, firstValueFrom } from 'rxjs';
import { Centrifuge, Subscription as CentrifugeSubscription } from 'centrifuge';
import { NotificationService } from '../features/dashboard/notifications/notification.service';
import { Notification } from '../shared/models/notification.model';
import { NotificationPushDto, mapNotificationPushDto } from '../shared/models/dto/notification.dto';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CentrifugoService implements OnDestroy {
  private readonly notifSvc = inject(NotificationService);

  private centrifuge: Centrifuge | null = null;
  private sub: CentrifugeSubscription | null = null;
  private connecting = false;

  private readonly _notifications$ = new Subject<Notification>();

  readonly notifications$: Observable<Notification> = this._notifications$.asObservable();


  async connect(userId: string): Promise<void> {
    if (this.centrifuge || this.connecting) return;
    this.connecting = true;

    try {
      const { token } = await firstValueFrom(this.notifSvc.getCentrifugoToken());

      this.centrifuge = new Centrifuge(environment.wsUrl, {
        token,
        getToken: async () => {
          const t = await firstValueFrom(this.notifSvc.getCentrifugoToken());
          return t.token;
        },
      });

      if (isDevMode()) {
        this.centrifuge.on('connected',    ctx  => console.debug('[Centrifugo] connected', ctx));
        this.centrifuge.on('disconnected', ctx  => console.debug('[Centrifugo] disconnected', ctx));
        this.centrifuge.on('error',        ctx  => console.error('[Centrifugo] error', ctx));
      }

      const channel = `notifications:#${userId}`;
      this.sub = this.centrifuge.newSubscription(channel);

      if (isDevMode()) {
        this.sub.on('subscribed',   ctx => console.debug('[Centrifugo] subscribed to', channel, ctx));
        this.sub.on('error',        ctx => console.error('[Centrifugo] subscription error', ctx));
      }

      this.sub.on('publication', ctx => {
        const dto = ctx.data as NotificationPushDto;
        this._notifications$.next(mapNotificationPushDto(dto));
      });

      this.sub.subscribe();
      this.centrifuge.connect();

    } catch (err) {
      this.centrifuge = null;
      if (isDevMode()) {
        console.error('[Centrifugo] failed to connect:', err);
      }
    } finally {
      this.connecting = false;
    }
  }

  disconnect(): void {
    this.sub?.unsubscribe();
    this.centrifuge?.disconnect();
    this.sub = null;
    this.centrifuge = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
