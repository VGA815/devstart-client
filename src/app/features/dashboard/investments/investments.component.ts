import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal, computed,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupService } from '../../startups/startup.service';
import { InvestorProfileService } from '../../investors/investor-profile.service';
import { InvestmentApplicationService } from '../../investors/investment-application.service';
import { InvestmentDealService } from '../../investors/investment-deal.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { InvestorProfile } from '../../../shared/models/investor-profile.model';
import { InvestmentApplication } from '../../../shared/models/investment-application.model';
import { InvestmentDeal } from '../../../shared/models/investment-deal.model';
import { Startup } from '../../../shared/models/startup.model';
import { formatMoney, formatRelativeTime } from '../../../shared/utils/format.utils';

type Tab = 'my-apps' | 'incoming' | 'deals';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [SkeletonComponent, FormsModule, RouterLink],
  templateUrl: './investments.component.html',
  styleUrl: './investments.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestmentsComponent implements OnInit {
  private readonly auth          = inject(AuthService);
  private readonly startupSvc   = inject(StartupService);
  private readonly profileSvc   = inject(InvestorProfileService);
  private readonly appSvc       = inject(InvestmentApplicationService);
  private readonly dealSvc      = inject(InvestmentDealService);

  readonly profileLoading  = signal(true);
  readonly profile         = signal<InvestorProfile | null>(null);
  readonly showProfileForm = signal(false);

  readonly formType        = signal(0); // 0=Individual, 1=Fund
  readonly formName        = signal('');
  readonly formBio         = signal('');
  readonly formWebsite     = signal('');
  readonly formPublic      = signal(true);
  readonly formSaving      = signal(false);
  readonly formError       = signal('');

  readonly activeTab = signal<Tab>('my-apps');

  readonly myAppsLoading = signal(false);
  readonly myApps        = signal<InvestmentApplication[]>([]);
  readonly withdrawing   = signal<string | null>(null);

  readonly myStartups          = signal<Startup[]>([]);
  readonly incomingLoading     = signal(false);
  readonly incomingApps        = signal<InvestmentApplication[]>([]);
  readonly respondingApp       = signal<string | null>(null);

  readonly dealsLoading    = signal(false);
  readonly deals           = signal<InvestmentDeal[]>([]);
  readonly confirmingDeal  = signal<string | null>(null);

  private loadedTabs = new Set<Tab>();

  constructor() {
    inject(Title).setTitle('Инвестиции — DevStart');
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.profileLoading.set(false); return; }

    forkJoin({
      profile: this.profileSvc.getById(user.id).pipe(catchError(() => of(null))),
      startups: this.startupSvc.getStartupsByProfile(user.id).pipe(catchError(() => of([] as Startup[]))),
    }).subscribe(({ profile, startups }) => {
      this.profile.set(profile);
      this.myStartups.set(startups);
      this.profileLoading.set(false);
      this.loadTab(this.activeTab());
    });
  }


  openProfileForm(): void {
    const p = this.profile();
    if (p) {
      this.formType.set(p.type === 'Individual' ? 0 : 1);
      this.formName.set(p.displayName);
      this.formBio.set(p.bio ?? '');
      this.formWebsite.set(p.website ?? '');
      this.formPublic.set(p.isPublic);
    } else {
      this.formType.set(0);
      this.formName.set('');
      this.formBio.set('');
      this.formWebsite.set('');
      this.formPublic.set(true);
    }
    this.formError.set('');
    this.showProfileForm.set(true);
  }

  saveProfile(): void {
    if (!this.formName().trim()) { this.formError.set('Укажите имя или название'); return; }
    this.formSaving.set(true);
    this.formError.set('');

    const body = {
      type: this.formType(),
      display_name: this.formName().trim(),
      bio: this.formBio().trim() || undefined,
      website: this.formWebsite().trim() || undefined,
      is_public: this.formPublic(),
    };

    const user = this.auth.user()!;
    const request$ = this.profile()
      ? this.profileSvc.update(body).pipe(
          switchMap(() => this.profileSvc.getById(user.id)),
        )
      : this.profileSvc.create(body).pipe(
          switchMap(() => this.profileSvc.getById(user.id)),
        );

    request$.pipe(catchError(() => of(null))).subscribe(updated => {
      this.formSaving.set(false);
      if (!updated) { this.formError.set('Не удалось сохранить. Попробуйте снова.'); return; }
      this.profile.set(updated);
      this.showProfileForm.set(false);
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.loadTab(tab);
  }

  private loadTab(tab: Tab): void {
    if (this.loadedTabs.has(tab)) return;
    this.loadedTabs.add(tab);

    const user = this.auth.user();
    if (!user) return;

    switch (tab) {
      case 'my-apps':
        if (!this.profile()) break;
        this.myAppsLoading.set(true);
        this.appSvc.getByInvestor(user.id).pipe(catchError(() => of([]))).subscribe(apps => {
          this.myApps.set(apps);
          this.myAppsLoading.set(false);
        });
        break;

      case 'incoming':
        if (this.myStartups().length === 0) break;
        this.incomingLoading.set(true);
        forkJoin(
          this.myStartups().map(s => this.appSvc.getByStartup(s.id).pipe(catchError(() => of([]))))
        ).subscribe(results => {
          this.incomingApps.set(results.flat());
          this.incomingLoading.set(false);
        });
        break;

      case 'deals':
        this.dealsLoading.set(true);
        const dealSources = [
          ...(this.profile() ? [this.dealSvc.getByInvestor(user.id).pipe(catchError(() => of([])))] : []),
          ...this.myStartups().map(s => this.dealSvc.getByStartup(s.id).pipe(catchError(() => of([])))),
        ];
        if (dealSources.length === 0) { this.dealsLoading.set(false); break; }
        forkJoin(dealSources).subscribe(results => {
          // Deduplicate by deal ID
          const seen = new Set<string>();
          const merged = results.flat().filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });
          this.deals.set(merged);
          this.dealsLoading.set(false);
        });
        break;
    }
  }

  private reloadTab(tab: Tab): void {
    this.loadedTabs.delete(tab);
    this.loadTab(tab);
  }


  withdraw(app: InvestmentApplication): void {
    this.withdrawing.set(app.id);
    this.appSvc.withdraw(app.id).pipe(catchError(() => of(null))).subscribe(() => {
      this.withdrawing.set(null);
      this.myApps.update(list => list.map(a => a.id === app.id ? { ...a, status: 'Withdrawn' } : a));
    });
  }

  accept(app: InvestmentApplication): void {
    this.respondingApp.set(app.id);
    this.appSvc.accept(app.id).pipe(catchError(() => of(null))).subscribe(dealId => {
      this.respondingApp.set(null);
      this.incomingApps.update(list => list.map(a => a.id === app.id ? { ...a, status: 'Accepted' } : a));
      if (dealId) this.reloadTab('deals');
    });
  }

  reject(app: InvestmentApplication): void {
    this.respondingApp.set(app.id);
    this.appSvc.reject(app.id).pipe(catchError(() => of(null))).subscribe(() => {
      this.respondingApp.set(null);
      this.incomingApps.update(list => list.map(a => a.id === app.id ? { ...a, status: 'Rejected' } : a));
    });
  }

  confirmDeal(deal: InvestmentDeal): void {
    const user = this.auth.user()!;
    this.confirmingDeal.set(deal.id);

    const isInvestor  = deal.investorProfileId === user.id;
    const request$    = isInvestor
      ? this.dealSvc.confirmByInvestor(deal.id)
      : this.dealSvc.confirmByStartup(deal.id);

    request$.pipe(catchError(() => of(null))).subscribe(() => {
      this.confirmingDeal.set(null);
      this.deals.update(list => list.map(d => {
        if (d.id !== deal.id) return d;
        const updated = {
          ...d,
          confirmedByInvestor: isInvestor ? true : d.confirmedByInvestor,
          confirmedByStartup:  isInvestor ? d.confirmedByStartup : true,
        };
        if (updated.confirmedByInvestor && updated.confirmedByStartup) {
          updated.status = 'Completed';
        }
        return updated;
      }));
    });
  }


  canConfirmDeal(deal: InvestmentDeal): boolean {
    const userId = this.auth.user()?.id;
    if (!userId || deal.status !== 'InProgress') return false;
    if (deal.investorProfileId === userId) return !deal.confirmedByInvestor;
    const isStartupMember = this.myStartups().some(s => s.id === deal.startupId);
    return isStartupMember && !deal.confirmedByStartup;
  }

  appStatusLabel(status: string): string {
    return { Pending: 'На рассмотрении', Accepted: 'Принята', Rejected: 'Отклонена', Withdrawn: 'Отозвана' }[status] ?? status;
  }

  appStatusClass(status: string): string {
    return { Pending: 'badge--yellow', Accepted: 'badge--green', Rejected: 'badge--red', Withdrawn: 'badge--gray' }[status] ?? '';
  }

  dealStatusLabel(status: string): string {
    return { InProgress: 'В процессе', Completed: 'Завершена', Cancelled: 'Отменена' }[status] ?? status;
  }

  dealStatusClass(status: string): string {
    return { InProgress: 'badge--accent', Completed: 'badge--green', Cancelled: 'badge--gray' }[status] ?? '';
  }

  instrumentLabel(instrument: string): string {
    return { Safe: 'SAFE', ConvertibleLoan: 'Конвертируемый заём', PricedRound: 'Priced Round' }[instrument] ?? instrument;
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatDate  = formatRelativeTime;
}
