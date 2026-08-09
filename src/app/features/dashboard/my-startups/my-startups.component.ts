import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupService } from '../../startups/startup.service';
import { Startup, StartupRole } from '../../../shared/models/startup.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { IncomingCollaborationRequestsComponent } from './incoming-collaboration-requests.component';
import { StartupMetricsCardComponent } from './metrics-card/metrics-card.component';
import { StartupRoadmapCardComponent } from './roadmap-card/roadmap-card.component';
import { StartupTeamCardComponent } from './team-card/team-card.component';
import { StartupDocsCardComponent } from './docs-card/docs-card.component';
import { StartupCapTableCardComponent } from './cap-table-card/cap-table-card.component';
import { StartupCommunityCardComponent } from './community-card/community-card.component';
import { ServicePurchaseFacade } from '../../billing/service-purchase/service-purchase.facade';
import { toStartupTarget } from '../../billing/service-purchase/service-purchase.store';

@Component({
  selector: 'app-my-startups',
  standalone: true,
  imports: [
    RouterLink, SkeletonComponent, AvatarComponent,
    IncomingCollaborationRequestsComponent,
    StartupMetricsCardComponent,
    StartupRoadmapCardComponent,
    StartupTeamCardComponent,
    StartupDocsCardComponent,
    StartupCapTableCardComponent,
    StartupCommunityCardComponent,
  ],
  templateUrl: './my-startups.component.html',
  styleUrl: './my-startups.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyStartupsComponent implements OnInit {
  private readonly auth       = inject(AuthService);
  private readonly startupSvc = inject(StartupService);
  private readonly purchase   = inject(ServicePurchaseFacade);

  readonly loading       = signal(true);
  readonly startups      = signal<Startup[]>([]);
  readonly startup       = signal<Startup | null>(null);
  readonly selectedIndex = signal(0);
  readonly myRole        = signal<StartupRole | null>(null);

  readonly currentUserId = computed(() => this.auth.user()?.id ?? null);

  readonly roleBadge = computed(() => {
    switch (this.myRole()) {
      case 'Founder':        return { label: 'Основатель', mod: 'founder' };
      case 'Administration': return { label: 'Менеджер',   mod: 'admin'   };
      case 'Member':         return { label: 'Участник',   mod: 'member'  };
      default:               return { label: 'Участник',   mod: 'member'  };
    }
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }

    this.startupSvc.getStartupsByProfile(user.id).subscribe({
      next: list => {
        this.startups.set(list);
        this.startup.set(list[0] ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectStartup(index: number): void {
    this.selectedIndex.set(index);
    this.startup.set(this.startups()[index] ?? null);
    this.myRole.set(null);
  }

  /**
   * Открывает диалог покупки с уже выбранным проектом: остаётся указать услугу.
   * Список услуг фасад сузит до тех, что покупаются для стартапа.
   */
  buyService(): void {
    const startup = this.startup();
    if (!startup) return;

    this.purchase.open({ target: toStartupTarget(startup) });
  }
}
