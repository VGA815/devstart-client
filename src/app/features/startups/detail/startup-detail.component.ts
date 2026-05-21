import { Component, ChangeDetectionStrategy, inject, OnInit, Input, signal, HostListener, effect } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { TagComponent } from '../../../shared/components/tag/tag.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { getStageColor } from '../../../shared/utils/startup.utils';
import { formatMoney } from '../../../shared/utils/format.utils';

import { StartupDetailStore, DetailTab } from './startup-detail.store';
import { StartupDetailFacade } from './startup-detail.facade';
import { OverviewTabComponent } from './tabs/overview-tab.component';
import { RoadmapTabComponent } from './tabs/roadmap-tab.component';
import { MetricsTabComponent } from './tabs/metrics-tab.component';
import { TeamTabComponent } from './tabs/team-tab.component';
import { DocumentsTabComponent } from './tabs/documents-tab.component';
import { CompetitorsTabComponent } from './tabs/competitors-tab.component';
import { ScoringTabComponent } from './tabs/scoring-tab.component';
import { InvestFormComponent } from './invest-form/invest-form.component';

@Component({
  selector: 'app-startup-detail',
  standalone: true,
  imports: [
    TagComponent, SkeletonComponent, AvatarComponent,
    OverviewTabComponent, RoadmapTabComponent, MetricsTabComponent, TeamTabComponent,
    DocumentsTabComponent, CompetitorsTabComponent, ScoringTabComponent, InvestFormComponent,
  ],
  providers: [StartupDetailStore, StartupDetailFacade],
  templateUrl: './startup-detail.component.html',
  styleUrl: './startup-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupDetailComponent implements OnInit {
  @Input() id!: string;

  protected readonly facade = inject(StartupDetailFacade);
  private readonly router   = inject(Router);
  private readonly titleSvc = inject(Title);
  private readonly metaSvc  = inject(Meta);

  readonly showScrollTop  = signal(false);
  readonly showInvestForm = signal(false);

  readonly tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview',     label: 'Обзор' },
    { key: 'roadmap',      label: 'Дорожная карта' },
    { key: 'metrics',      label: 'Метрики' },
    { key: 'team',         label: 'Команда' },
    { key: 'documents',    label: 'Документы' },
    { key: 'competitors',  label: 'Конкуренты' },
    { key: 'scoring',      label: '★ Скоринг' },
  ];

  constructor() {
    effect(() => {
      const s = this.facade.startup();
      if (s) {
        this.titleSvc.setTitle(`${s.name} — DevStart`);
        this.metaSvc.updateTag({ property: 'og:title', content: s.name });
        this.metaSvc.updateTag({ property: 'og:description', content: s.description ?? '' });
      }
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showScrollTop.set(window.scrollY > 420);
  }

  ngOnInit(): void {
    this.facade.init(this.id);
  }

  openInvestForm(): void {
    if (!this.facade.isAuthenticated()) { this.router.navigate(['/login']); return; }
    this.facade.prepareInvest();
    this.showInvestForm.set(true);
  }

  startChat(): void {
    this.router.navigate(['/dashboard/messages'], {
      queryParams: { recipientId: this.id, recipientType: 1 },
    });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getFoundedYear(createdAt: string): string {
    return new Date(createdAt).getFullYear().toString();
  }

  protected readonly getStageColor = getStageColor;
  protected readonly formatMoney   = formatMoney;
}
