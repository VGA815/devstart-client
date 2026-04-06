import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal, computed, Input, HostListener } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { StartupService } from '../startup.service';
import { StartupRoadmapService } from '../startup-roadmap.service';
import { StartupDocumentsService } from '../startup-documents.service';
import { StartupMetricsService } from '../startup-metrics.service';
import { StartupMembersService } from '../startup-members.service';
import { StartupFollowersService } from '../startup-followers.service';
import { StartupCompetitorsService } from '../startup-competitors.service';
import { StartupScoreService } from '../startup-score.service';
import { ProfileService } from '../profile.service';
import { AuthService } from '../../../core/auth/auth.service';
import { InvestorProfileService } from '../../investors/investor-profile.service';
import { InvestmentApplicationService } from '../../investors/investment-application.service';
import { FormsModule } from '@angular/forms';
import { Startup, StartupMember } from '../../../shared/models/startup.model';
import { Profile } from '../../../shared/models/profile.model';
import { InvestorProfile } from '../../../shared/models/investor-profile.model';
import { StartupRoadmapItem } from '../../../shared/models/startup-roadmap.model';
import { StartupMetric } from '../../../shared/models/startup-metric.model';
import { StartupDocument } from '../../../shared/models/startup-document.model';
import { StartupCompetitor } from '../../../shared/models/startup-competitor.model';
import { StartupScore } from '../../../shared/models/startup-score.model';
import { TagComponent } from '../../../shared/components/tag/tag.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';
import { formatQuarter, formatMoney, formatRelativeTime } from '../../../shared/utils/format.utils';
import {
  getStageColor, getRoadmapStatusClass, getRoadmapStatusLabel,
  formatMetricValue, getMetricLabel, getMetricColor,
  getDocumentTypeLabel, getDocumentIcon, formatFileSize,
  getPositionLabel,
} from '../../../shared/utils/startup.utils';

type Tab = 'overview' | 'roadmap' | 'metrics' | 'team' | 'documents' | 'competitors' | 'scoring';

const ROLE_COLORS: Record<string, string> = {
  Founder: '#2f81f7',
  Administration: '#bc8cff',
  Member: '#3fb950',
};

const POSITION_OPTIONS = [
  { label: '— Не указана —', value: 0 },
  { label: 'CEO',  value: 1 },
  { label: 'CTO',  value: 2 },
  { label: 'CMO',  value: 3 },
  { label: 'COO',  value: 4 },
  { label: 'CFO',  value: 5 },
  { label: 'CPO',  value: 6 },
];

@Component({
  selector: 'app-startup-detail',
  standalone: true,
  imports: [RouterLink, TagComponent, SkeletonComponent, AvatarComponent, MarkdownPipe, FormsModule],
  templateUrl: './startup-detail.component.html',
  styleUrl: './startup-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupDetailComponent implements OnInit, OnDestroy {
  @Input() id!: string;

  private readonly router              = inject(Router);
  private readonly service             = inject(StartupService);
  private readonly roadmapSvc          = inject(StartupRoadmapService);
  private readonly docsSvc             = inject(StartupDocumentsService);
  private readonly metricsSvc          = inject(StartupMetricsService);
  private readonly membersSvc          = inject(StartupMembersService);
  private readonly followersSvc        = inject(StartupFollowersService);
  private readonly competitorsSvc      = inject(StartupCompetitorsService);
  private readonly scoreSvc            = inject(StartupScoreService);
  private readonly profileSvc          = inject(ProfileService);
  private readonly authSvc             = inject(AuthService);
  private readonly investorProfileSvc  = inject(InvestorProfileService);
  private readonly investAppSvc        = inject(InvestmentApplicationService);
  private readonly titleSvc            = inject(Title);
  private readonly metaSvc             = inject(Meta);

  readonly startup = signal<Startup | null>(null);
  readonly loading = signal(true);
  readonly activeTab = signal<Tab>('overview');

  readonly score        = signal<StartupScore | null>(null);
  readonly scoreLoading = signal(false);
  // null = no error, 403 = forbidden, 404/other = no data
  readonly scoreErrorStatus = signal<number | null>(null);

  readonly descExpanded = signal(false);

  readonly showScrollTop = signal(false);

  readonly followersCount = signal(0);
  readonly isFollowing    = signal(false);
  readonly followLoading  = signal(false);

  readonly isAuthenticated = computed(() => !!this.authSvc.user());

  // undefined = not yet loaded; null = no profile; InvestorProfile = has profile
  readonly investorProfile  = signal<InvestorProfile | null | undefined>(undefined);
  readonly showInvestForm   = signal(false);
  readonly investAmount     = signal('');
  readonly investRoadmapId  = signal('');
  readonly investMessage    = signal('');
  readonly investInstrument = signal(0); // 0=SAFE, 1=ConvertibleLoan, 2=PricedRound
  readonly investValuationCap     = signal('');
  readonly investDiscount         = signal('');
  readonly investInterestRate     = signal('');
  readonly investTermMonths       = signal('');
  readonly investPreMoney         = signal('');
  readonly investLiquidationPref  = signal('');
  readonly investProRata          = signal(false);
  readonly suggestedTerms         = signal<import('../../../shared/models/startup-score.model').SuggestedTerms | null>(null);
  readonly suggestedTermsLoading  = signal(false);
  readonly investSubmitting = signal(false);
  readonly investError      = signal('');
  readonly investSuccess    = signal(false);
  private investorProfileLoaded = false;

  readonly roadmap         = signal<StartupRoadmapItem[]>([]);
  readonly roadmapLoading  = signal(false);
  readonly expandedRoadmapId = signal<string | null>(null);
  readonly docs            = signal<StartupDocument[]>([]);
  readonly docsLoading     = signal(false);
  readonly metrics         = signal<StartupMetric[]>([]);
  readonly metricsLoading  = signal(false);
  readonly members         = signal<StartupMember[]>([]);
  readonly membersLoading  = signal(false);
  readonly memberProfiles  = signal<Map<string, Profile>>(new Map());

  readonly competitors         = signal<StartupCompetitor[]>([]);
  readonly competitorsLoading  = signal(false);
  readonly showCompetitorForm  = signal(false);
  readonly editingCompetitor   = signal<StartupCompetitor | null>(null);
  readonly competitorName      = signal('');
  readonly competitorWebsite   = signal('');
  readonly competitorDesc      = signal('');
  readonly competitorStrengths = signal('');
  readonly competitorWeaknesses = signal('');
  readonly competitorSaving    = signal(false);
  readonly competitorError     = signal('');
  readonly deletingCompetitorId = signal<string | null>(null);

  readonly editingMemberProfile   = signal(false);
  readonly memberPositionEdit     = signal(0);
  readonly memberBioEdit          = signal('');
  readonly memberYearsEdit        = signal('');
  readonly memberHasPriorExit     = signal(false);
  readonly memberPrevStartups     = signal('');
  readonly memberProfileSaving    = signal(false);
  readonly memberProfileError     = signal('');
  readonly memberProfileSuccess   = signal(false);

  readonly isFounderOrAdmin = computed(() => {
    const userId = this.authSvc.user()?.id;
    if (!userId) return false;
    return this.members().some(
      m => m.profileId === userId && (m.role === 'Founder' || m.role === 'Administration')
    );
  });

  readonly myMember = computed(() => {
    const userId = this.authSvc.user()?.id;
    if (!userId) return null;
    return this.members().find(m => m.profileId === userId) ?? null;
  });

  private loaded = new Set<Tab>();

  readonly positionOptions = POSITION_OPTIONS;

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Обзор' },
    { key: 'roadmap',      label: 'Дорожная карта' },
    { key: 'metrics',      label: 'Метрики' },
    { key: 'team',         label: 'Команда' },
    { key: 'documents',    label: 'Документы' },
    { key: 'competitors',  label: 'Конкуренты' },
    { key: 'scoring',      label: '★ Скоринг' },
  ];

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showScrollTop.set(window.scrollY > 420);
  }

  ngOnDestroy(): void { }

  ngOnInit(): void {
    this.service.getStartup(this.id).subscribe({
      next: s => {
        this.startup.set(s);
        this.loading.set(false);
        this.titleSvc.setTitle(`${s.name} — DevStart`);
        this.metaSvc.updateTag({ property: 'og:title', content: s.name });
        this.metaSvc.updateTag({ property: 'og:description', content: s.description ?? '' });
        this.loadTabData('metrics');
        this.loadFollowers();
        if (this.authSvc.user()) {
          this.loadScore();
          this.loadTabData('team');
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private loadScore(): void {
    this.scoreLoading.set(true);
    this.scoreErrorStatus.set(null);
    this.scoreSvc.getScore(this.id).pipe(
      catchError((err: HttpErrorResponse) => {
        this.scoreErrorStatus.set(err.status ?? 0);
        return of(null);
      })
    ).subscribe(s => {
      this.score.set(s);
      this.scoreLoading.set(false);
    });
  }

  private loadFollowers(): void {
    this.followersSvc.getFollowers(this.id).subscribe({
      next: followers => {
        this.followersCount.set(followers.length);
        const userId = this.authSvc.user()?.id;
        this.isFollowing.set(!!userId && followers.some(f => f.profileId === userId));
      },
      error: () => { },
    });
  }

  toggleFollow(): void {
    const user = this.authSvc.user();
    if (!user || this.followLoading()) return;

    this.followLoading.set(true);
    const wasFollowing = this.isFollowing();

    this.isFollowing.set(!wasFollowing);
    this.followersCount.update(n => wasFollowing ? n - 1 : n + 1);

    const request$ = wasFollowing
      ? this.followersSvc.unfollow(this.id)
      : this.followersSvc.follow(this.id, user.id);

    request$.subscribe({
      next: () => this.followLoading.set(false),
      error: () => {
        this.isFollowing.set(wasFollowing);
        this.followersCount.update(n => wasFollowing ? n + 1 : n - 1);
        this.followLoading.set(false);
      },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.loadTabData(tab);
  }

  private loadTabData(tab: Tab): void {
    if (this.loaded.has(tab)) return;
    this.loaded.add(tab);

    switch (tab) {
      case 'roadmap':
        this.roadmapLoading.set(true);
        this.roadmapSvc.getRoadmapItems(this.id).subscribe({
          next: items => { this.roadmap.set(items); this.roadmapLoading.set(false); },
          error: () => this.roadmapLoading.set(false),
        });
        break;

      case 'metrics':
        this.metricsLoading.set(true);
        this.metricsSvc.getMetrics(this.id).subscribe({
          next: items => { this.metrics.set(items); this.metricsLoading.set(false); },
          error: () => this.metricsLoading.set(false),
        });
        break;

      case 'team':
        this.membersLoading.set(true);
        this.membersSvc.getMembers(this.id).subscribe({
          next: items => {
            this.members.set(items);
            const validItems = items.filter(m => !!m.profileId);
            if (validItems.length > 0) {
              forkJoin(
                Object.fromEntries(
                  validItems.map(m => [m.profileId, this.profileSvc.getProfile(m.profileId).pipe(catchError(() => of(null)))])
                )
              ).subscribe(profileMap => {
                const map = new Map<string, Profile>();
                for (const [id, profile] of Object.entries(profileMap)) {
                  if (profile) map.set(id, profile as Profile);
                }
                this.memberProfiles.set(map);
              });
            }
            this.membersLoading.set(false);
          },
          error: () => this.membersLoading.set(false),
        });
        break;

      case 'documents':
        this.docsLoading.set(true);
        this.docsSvc.getDocuments(this.id).subscribe({
          next: items => { this.docs.set(items); this.docsLoading.set(false); },
          error: () => this.docsLoading.set(false),
        });
        break;

      case 'competitors':
        this.competitorsLoading.set(true);
        this.competitorsSvc.getByStartupId(this.id).pipe(
          catchError(() => of([]))
        ).subscribe(items => {
          this.competitors.set(items);
          this.competitorsLoading.set(false);
        });
        break;
    }
  }

  toggleRoadmapExpand(item: StartupRoadmapItem): void {
    this.expandedRoadmapId.update(id => id === item.id ? null : item.id);
  }

  openNewCompetitorForm(): void {
    this.editingCompetitor.set(null);
    this.competitorName.set('');
    this.competitorWebsite.set('');
    this.competitorDesc.set('');
    this.competitorStrengths.set('');
    this.competitorWeaknesses.set('');
    this.competitorError.set('');
    this.showCompetitorForm.set(true);
  }

  openEditCompetitorForm(c: StartupCompetitor): void {
    this.editingCompetitor.set(c);
    this.competitorName.set(c.name);
    this.competitorWebsite.set(c.website ?? '');
    this.competitorDesc.set(c.description ?? '');
    this.competitorStrengths.set(c.strengthsVsUs ?? '');
    this.competitorWeaknesses.set(c.weaknessesVsUs ?? '');
    this.competitorError.set('');
    this.showCompetitorForm.set(true);
  }

  cancelCompetitorForm(): void {
    this.showCompetitorForm.set(false);
    this.editingCompetitor.set(null);
  }

  saveCompetitor(): void {
    const name = this.competitorName().trim();
    if (!name) { this.competitorError.set('Название обязательно'); return; }

    this.competitorSaving.set(true);
    this.competitorError.set('');

    const editing = this.editingCompetitor();
    const payload = {
      name,
      website: this.competitorWebsite().trim() || undefined,
      description: this.competitorDesc().trim() || undefined,
      strengths_vs_us: this.competitorStrengths().trim() || undefined,
      weaknesses_vs_us: this.competitorWeaknesses().trim() || undefined,
    };

    const request$: Observable<unknown> = editing
      ? this.competitorsSvc.update(editing.id, payload)
      : this.competitorsSvc.create({ startup_id: this.id, ...payload });

    request$.subscribe({
      next: () => {
        this.competitorSaving.set(false);
        this.showCompetitorForm.set(false);
        this.loaded.delete('competitors');
        this.loadTabData('competitors');
      },
      error: () => {
        this.competitorSaving.set(false);
        this.competitorError.set('Не удалось сохранить. Попробуйте снова.');
      },
    });
  }

  deleteCompetitor(c: StartupCompetitor): void {
    this.deletingCompetitorId.set(c.id);
    this.competitorsSvc.delete(c.id).subscribe({
      next: () => {
        this.deletingCompetitorId.set(null);
        this.competitors.update(list => list.filter(x => x.id !== c.id));
      },
      error: () => this.deletingCompetitorId.set(null),
    });
  }


  openMemberProfileEdit(): void {
    const me = this.myMember();
    if (!me) return;
    const posMap: Record<string, number> = {
      Other: 0, CEO: 1, CTO: 2, CMO: 3, COO: 4, CFO: 5, CPO: 6,
    };
    this.memberPositionEdit.set(me.position ? (posMap[me.position] ?? 0) : 0);
    this.memberBioEdit.set(me.bio ?? '');
    this.memberYearsEdit.set(me.yearsOfExperience != null ? String(me.yearsOfExperience) : '');
    this.memberHasPriorExit.set(me.hasPriorExit ?? false);
    this.memberPrevStartups.set(me.previousStartupsCount != null ? String(me.previousStartupsCount) : '');
    this.memberProfileError.set('');
    this.memberProfileSuccess.set(false);
    this.editingMemberProfile.set(true);
  }

  cancelMemberProfileEdit(): void {
    this.editingMemberProfile.set(false);
  }

  saveMemberProfile(): void {
    this.memberProfileSaving.set(true);
    this.memberProfileError.set('');

    const years = this.memberYearsEdit().trim();
    const yearsNum = years ? parseInt(years, 10) : undefined;
    const prevCount = this.memberPrevStartups().trim();
    const prevNum = prevCount ? parseInt(prevCount, 10) : undefined;

    this.membersSvc.updateMemberProfile({
      startup_id: this.id,
      position: this.memberPositionEdit() || undefined,
      bio: this.memberBioEdit().trim() || undefined,
      years_of_experience: yearsNum && !isNaN(yearsNum) ? yearsNum : undefined,
      has_prior_exit: this.memberHasPriorExit(),
      previous_startups_count: prevNum && !isNaN(prevNum) ? prevNum : undefined,
    }).subscribe({
      next: () => {
        this.memberProfileSaving.set(false);
        this.memberProfileSuccess.set(true);
        this.editingMemberProfile.set(false);
        this.loaded.delete('team');
        this.loadTabData('team');
      },
      error: () => {
        this.memberProfileSaving.set(false);
        this.memberProfileError.set('Не удалось сохранить профиль.');
      },
    });
  }

  protected readonly getStageColor        = getStageColor;
  protected readonly getRoadmapStatusClass = getRoadmapStatusClass;
  protected readonly getRoadmapStatusLabel = getRoadmapStatusLabel;
  protected readonly getMetricLabel       = getMetricLabel;
  protected readonly getMetricColor       = getMetricColor;
  protected readonly formatMetricValue    = formatMetricValue;
  protected readonly formatTargetDate     = formatQuarter;
  protected readonly formatMoney          = formatMoney;
  protected readonly formatRelativeTime   = formatRelativeTime;
  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly getDocumentIcon      = getDocumentIcon;
  protected readonly formatFileSize       = formatFileSize;
  protected readonly getPositionLabel     = getPositionLabel;

  getMemberDisplayName(profileId: string): string {
    return this.memberProfiles().get(profileId)?.name ?? 'Участник';
  }

  getMemberAvatarId(profileId: string): string | null {
    return this.memberProfiles().get(profileId)?.avatarId ?? null;
  }

  getMemberColor(role: string): string {
    return ROLE_COLORS[role] ?? '#7d8590';
  }

  getFoundedYear(createdAt: string): string {
    return new Date(createdAt).getFullYear().toString();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleDesc(): void {
    this.descExpanded.update(v => !v);
  }

  startChat(): void {
    this.router.navigate(['/dashboard/messages'], {
      queryParams: { recipientId: this.id, recipientType: 1 },
    });
  }


  loadSuggestedTerms(): void {
    const amount = parseFloat(this.investAmount());
    if (!amount || isNaN(amount) || amount <= 0) return;
    if (!this.investorProfile()) return;

    this.suggestedTermsLoading.set(true);
    this.suggestedTerms.set(null);
    this.scoreSvc.getSuggestedTerms(this.id, this.investInstrument(), amount).pipe(
      catchError(() => of(null))
    ).subscribe(terms => {
      this.suggestedTerms.set(terms);
      if (terms) {
        this.investValuationCap.set(terms.valuationCap != null ? String(terms.valuationCap) : '');
        this.investDiscount.set(terms.discount != null ? String(terms.discount) : '');
        this.investInterestRate.set(terms.interestRate != null ? String(terms.interestRate) : '');
        this.investTermMonths.set(terms.termMonths != null ? String(terms.termMonths) : '');
        this.investPreMoney.set(terms.preMoneyValuation != null ? String(terms.preMoneyValuation) : '');
        this.investLiquidationPref.set(terms.liquidationPreference != null ? String(terms.liquidationPreference) : '');
        this.investProRata.set(terms.proRataRights);
      }
      this.suggestedTermsLoading.set(false);
    });
  }

  openInvestForm(): void {
    const user = this.authSvc.user();
    if (!user) { this.router.navigate(['/login']); return; }

    this.investAmount.set('');
    this.investRoadmapId.set('');
    this.investMessage.set('');
    this.investInstrument.set(0);
    this.investValuationCap.set('');
    this.investDiscount.set('');
    this.investInterestRate.set('');
    this.investTermMonths.set('');
    this.investPreMoney.set('');
    this.investLiquidationPref.set('');
    this.investProRata.set(false);
    this.suggestedTerms.set(null);
    this.investError.set('');
    this.investSuccess.set(false);
    this.showInvestForm.set(true);

    if (!this.investorProfileLoaded) {
      this.investorProfileLoaded = true;
      this.investorProfileSvc.getById(user.id).pipe(
        catchError(() => of(null))
      ).subscribe(p => this.investorProfile.set(p));
    }

    this.loadTabData('roadmap');
  }

  submitApplication(): void {
    const profile = this.investorProfile();
    if (!profile) return;

    const amountNum = parseFloat(this.investAmount());
    if (!this.investAmount() || isNaN(amountNum) || amountNum <= 0) {
      this.investError.set('Укажите корректную сумму инвестиций');
      return;
    }

    this.investSubmitting.set(true);
    this.investError.set('');

    const parseNum = (s: string) => { const n = parseFloat(s); return isNaN(n) ? undefined : n; };

    this.investAppSvc.create({
      startup_id: this.id,
      roadmap_item_id: this.investRoadmapId() || undefined,
      amount: amountNum,
      message: this.investMessage().trim() || undefined,
      instrument: this.investInstrument(),
      valuation_cap: parseNum(this.investValuationCap()),
      discount: parseNum(this.investDiscount()),
      interest_rate: parseNum(this.investInterestRate()),
      term_months: parseNum(this.investTermMonths()),
      pre_money_valuation: parseNum(this.investPreMoney()),
      liquidation_preference: parseNum(this.investLiquidationPref()),
      pro_rata_rights: this.investProRata(),
    }).pipe(catchError(() => of(null))).subscribe(id => {
      this.investSubmitting.set(false);
      if (!id) {
        this.investError.set('Не удалось отправить заявку. Попробуйте снова.');
        return;
      }
      this.investSuccess.set(true);
    });
  }
}
