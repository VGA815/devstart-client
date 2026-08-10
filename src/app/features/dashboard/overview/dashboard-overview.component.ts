import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupService } from '../../startups/startup.service';
import { StartupMembersService } from '../../startups/startup-members.service';
import { NotificationService } from '../notifications/notification.service';
import { InvestmentApplicationService } from '../../investors/investment-application.service';
import { ProfileService } from '../../startups/profile.service';
import { InvestmentApplication } from '../../../shared/models/investment-application.model';
import { Startup, StartupMember, StartupRole } from '../../../shared/models/startup.model';
import { Notification } from '../../../shared/models/notification.model';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { formatRelativeTime } from '../../../shared/utils/format.utils';
import { getNotificationIcon } from '../../../shared/utils/notification.utils';

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [RouterLink, AvatarComponent],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly startupService = inject(StartupService);
  private readonly membersSvc = inject(StartupMembersService);
  private readonly notifService = inject(NotificationService);
  private readonly appService = inject(InvestmentApplicationService);
  private readonly profileSvc = inject(ProfileService);

  readonly loading = signal(true);
  readonly startups = signal<Startup[]>([]);
  readonly roleMap = signal<Map<string, StartupRole>>(new Map());
  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = signal<number | null>(null);
  readonly incomingCount = signal<number | null>(null);
  readonly profileAvatarId = signal<string | null>(null);
  readonly profileViews = signal<number | null>(null);

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }

    this.profileSvc.getProfile(user.id).subscribe({
      next: p => {
        this.profileAvatarId.set(p.avatarId);
        this.profileViews.set(p.viewCount);
      },
      error: () => {},
    });

    forkJoin({
      startups:    this.startupService.getStartupsByProfile(user.id).pipe(catchError(() => of([]))),
      notifs:      this.notifService.getAll(1, 4).pipe(catchError(() => of([]))),
      unreadCount: this.notifService.getUnreadCount().pipe(catchError(() => of(0))),
    }).subscribe(({ startups, notifs, unreadCount }) => {
      this.startups.set(startups);
      this.notifications.set(notifs);
      this.unreadCount.set(unreadCount);
      this.loading.set(false);

      if (startups.length === 0) {
        this.incomingCount.set(0);
        return;
      }

      forkJoin(
        Object.fromEntries(
          startups.map(s => [
            s.id,
            this.membersSvc.getMembers(s.id).pipe(catchError(() => of([] as StartupMember[])))
          ])
        )
      ).subscribe(membersMap => {
        const map = new Map<string, StartupRole>();
        for (const [startupId, members] of Object.entries(membersMap)) {
          const mine = (members as StartupMember[]).find(m => m.profileId === user.id);
          if (mine) map.set(startupId, mine.role);
        }
        this.roleMap.set(map);
      });

      // Заявок «ко мне» не существует: они приходят стартапам, поэтому счётчик собирается по
      // моим проектам. Читать их вправе только основатель и менеджер — у остальных запрос
      // отвечает 403, и такой стартап просто не попадает в сумму.
      forkJoin(
        startups.map(s => this.appService.getByStartup(s.id).pipe(
          catchError(() => of([] as InvestmentApplication[]))
        ))
      ).subscribe(perStartup => {
        this.incomingCount.set(
          perStartup.flat().filter(a => a.status === 'Pending').length
        );
      });
    });
  }

  protected readonly formatTime = formatRelativeTime;
  protected readonly getIcon    = getNotificationIcon;

  getRoleBadge(startupId: string): { label: string; mod: string } {
    switch (this.roleMap().get(startupId)) {
      case 'Founder':        return { label: 'Основатель',   mod: 'founder' };
      case 'Administration': return { label: 'Менеджер',     mod: 'admin'   };
      default:               return { label: 'Участник',     mod: 'member'  };
    }
  }
}
