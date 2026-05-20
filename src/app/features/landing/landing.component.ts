import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { AuthService } from '../../core/auth/auth.service';
import { StartupCatalogFacade } from '../startups/catalog/startup-catalog.facade';
import { StatsService } from '../../core/stats/stats.service';
import { TagComponent } from '../../shared/components/tag/tag.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { getStageColor } from '../../shared/utils/startup.utils';
import { PlatformStats } from '../../shared/models/stats.model';

function formatCount(n: number): string {
  return n.toLocaleString('ru-RU');
}

function formatRaised(amount: number): string {
  if (amount >= 1_000_000_000) return `₽ ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000)     return `₽ ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)         return `₽ ${(amount / 1_000).toFixed(0)}K`;
  return `₽ ${amount}`;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, TagComponent, SkeletonComponent, AvatarComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly catalog = inject(StartupCatalogFacade);
  private readonly titleSvc = inject(Title);
  private readonly metaSvc = inject(Meta);
  private readonly statsSvc = inject(StatsService);

  readonly skeletons = Array(5);

  private readonly platformStats = signal<PlatformStats | null>(null);

  readonly stats = computed(() => {
    const s = this.platformStats();
    if (!s) return [
      { value: '—', label: 'Стартапов' },
      { value: '—', label: 'Инвесторов' },
      { value: '—', label: 'Экспертов' },
      { value: '—', label: 'Привлечено' },
    ];
    return [
      { value: formatCount(s.startupsCount),  label: 'Стартапов' },
      { value: formatCount(s.investorsCount), label: 'Инвесторов' },
      { value: formatCount(s.expertsCount),   label: 'Экспертов' },
      { value: formatRaised(s.totalRaised),   label: 'Привлечено' },
    ];
  });

  readonly startupsCount = computed(() => {
    const s = this.platformStats();
    return s ? formatCount(s.startupsCount) : '...';
  });

  readonly features = [
    {
      icon: '🗂',
      title: 'Профиль стартапа',
      desc: 'Карточка с описанием, метриками, дорожной картой и командой. Загружайте pitch deck прямо на платформу.',
    },
    {
      icon: '🔍',
      title: 'Умный поиск',
      desc: 'Фильтрация по стадии, отрасли, географии и чеку. Инвесторы найдут именно ваш проект.',
    },
    {
      icon: '🤝',
      title: 'Заявки на сотрудничество',
      desc: 'Отправляйте и принимайте заявки от инвесторов и менторов. Всё в одном месте.',
    },
    {
      icon: '📊',
      title: 'Ключевые метрики',
      desc: 'MRR, DAU, runway — публикуйте метрики, которые важны инвесторам. Прозрачность — доверие.',
    },
  ];

  ngOnInit(): void {
    this.titleSvc.setTitle('DevStart — Площадка для стартапов');
    this.metaSvc.updateTag({ name: 'description', content: 'DevStart соединяет основателей с инвесторами и менторами.' });
    this.catalog.load({ page: 1, pageSize: 5 });
    this.statsSvc.getStats().subscribe({
      next: stats => this.platformStats.set(stats),
    });
  }

  protected readonly getStageColor = getStageColor;
}
