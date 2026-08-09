import {
  Component, ChangeDetectionStrategy, inject, OnInit, signal, computed,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { StartupCatalogFacade } from './startup-catalog.facade';
import { CATALOG_PAGE_SIZE } from './startup-catalog.store';
import { StartupRowMetricsComponent } from './startup-row-metrics/startup-row-metrics.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { StartupStage, StartupLocation } from '../../../shared/models/startup.model';
import { CommunityStandardsLevel } from '../../../shared/models/community-standards.model';
import { getStageBadgeClass, getStageBadgeLabel } from '../../../shared/utils/startup.utils';
import { getCommunityLevelLabel, getCommunityLevelMod } from '../../../shared/utils/community-standards.utils';

const LOCATION_LABELS: Record<StartupLocation, string> = {
  Russia: 'Россия', USA: 'США', China: 'Китай', India: 'Индия', Other: 'Другое',
};

@Component({
  selector: 'app-startup-catalog',
  standalone: true,
  imports: [RouterLink, SkeletonComponent, AvatarComponent, StartupRowMetricsComponent],
  templateUrl: './startup-catalog.component.html',
  styleUrl: './startup-catalog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupCatalogComponent implements OnInit {
  protected readonly facade      = inject(StartupCatalogFacade);
  private readonly route         = inject(ActivatedRoute);
  private readonly title         = inject(Title);
  private readonly meta          = inject(Meta);

  readonly skeletons = Array(8);

  readonly selectedStage     = signal<StartupStage | null>(null);
  readonly selectedLocation  = signal<StartupLocation | null>(null);
  readonly selectedCommunity = signal<CommunityStandardsLevel | null>(null);
  readonly searchQuery       = signal('');

  /**
   * Поиск клиентский: у `GET api/startups` нет текстового параметра, искать
   * можно только по уже загруженным страницам. Пока поле не пустое, прячем
   * «Показать ещё» — иначе кнопка догружала бы страницы, которых в
   * отфильтрованном списке может и не быть видно.
   */
  readonly filteredStartups = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.facade.startups();
    return this.facade.startups().filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.shortDescription?.toLowerCase().includes(q) ?? false)
    );
  });

  readonly canLoadMore = computed(() =>
    this.facade.hasMore() && this.searchQuery().trim() === ''
  );

  ngOnInit(): void {
    this.title.setTitle('Каталог стартапов — DevStart');
    this.meta.updateTag({ name: 'description', content: 'Каталог стартапов на платформе DevStart' });

    // Seed search & filters from the URL (e.g. when arriving from the landing filter bar).
    const params = this.route.snapshot.queryParamMap;
    this.searchQuery.set(params.get('q') ?? '');
    this.selectedStage.set(params.get('stage') as StartupStage | null);
    this.selectedLocation.set(params.get('location') as StartupLocation | null);
    this.selectedCommunity.set(params.get('community') as CommunityStandardsLevel | null);

    this.reload();
  }

  selectStage(value: string): void {
    this.selectedStage.set(value === '' ? null : value as StartupStage);
    this.searchQuery.set('');
    this.reload();
  }

  selectLocation(value: string): void {
    this.selectedLocation.set(value === '' ? null : value as StartupLocation);
    this.reload();
  }

  selectCommunity(value: string): void {
    this.selectedCommunity.set(value === '' ? null : value as CommunityStandardsLevel);
    this.reload();
  }

  /** Фильтры применяются на бэке, поэтому любое изменение перезапрашивает первую страницу. */
  private reload(): void {
    const stage = this.selectedStage();
    const loc   = this.selectedLocation();
    const level = this.selectedCommunity();
    this.facade.load({
      page: 1, pageSize: CATALOG_PAGE_SIZE,
      ...(stage ? { stage } : {}),
      ...(loc   ? { location: loc } : {}),
      ...(level ? { minCommunityStandards: level } : {}),
    });
  }

  loadMore(): void {
    this.facade.loadMore();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  locationLabel(loc: StartupLocation | null): string {
    return loc ? (LOCATION_LABELS[loc] ?? loc) : '';
  }

  protected readonly getStageBadgeClass     = getStageBadgeClass;
  protected readonly getStageBadgeLabel     = getStageBadgeLabel;
  protected readonly getCommunityLevelLabel = getCommunityLevelLabel;
  protected readonly getCommunityLevelMod   = getCommunityLevelMod;
}
