import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupCompetitor } from '../../../shared/models/startup-competitor.model';
import { SuggestedTerms } from '../../../shared/models/startup-score.model';
import {
  StartupDetailStore, DetailTab,
  CompetitorPayload, InvestPayload, MemberProfilePayload,
} from './startup-detail.store';


@Injectable()
export class StartupDetailFacade {
  private readonly store = inject(StartupDetailStore);
  private readonly auth  = inject(AuthService);

  readonly startup   = this.store.startup;
  readonly loading   = this.store.loading;
  readonly activeTab = this.store.activeTab;

  readonly score            = this.store.score;
  readonly scoreLoading     = this.store.scoreLoading;
  readonly scoreErrorStatus = this.store.scoreErrorStatus;

  readonly followersCount = this.store.followersCount;
  readonly isFollowing    = this.store.isFollowing;
  readonly followLoading  = this.store.followLoading;

  readonly roadmap        = this.store.roadmap;
  readonly roadmapLoading = this.store.roadmapLoading;
  readonly docs           = this.store.docs;
  readonly docsLoading    = this.store.docsLoading;
  readonly metrics        = this.store.metrics;
  readonly metricsLoading = this.store.metricsLoading;
  readonly members        = this.store.members;
  readonly membersLoading = this.store.membersLoading;
  readonly memberProfiles = this.store.memberProfiles;

  readonly competitors          = this.store.competitors;
  readonly competitorsLoading   = this.store.competitorsLoading;
  readonly deletingCompetitorId = this.store.deletingCompetitorId;

  readonly investorProfile = this.store.investorProfile;

  readonly isFounderOrAdmin = this.store.isFounderOrAdmin;
  readonly myMember         = this.store.myMember;
  readonly isAuthenticated  = this.auth.isAuthenticated;

  get currentUserId(): string | null {
    return this.auth.user()?.id ?? null;
  }

  init(id: string): void { this.store.init(id); }

  setTab(tab: DetailTab): void { this.store.setTab(tab); }

  toggleFollow(): void { this.store.toggleFollow(); }

  prepareInvest(): void { this.store.prepareInvest(); }

  loadSuggestedTerms(instrument: number, amount: number): Observable<SuggestedTerms | null> {
    return this.store.loadSuggestedTerms(instrument, amount);
  }

  submitApplication(payload: InvestPayload): Observable<string | null> {
    return this.store.submitApplication(payload);
  }

  saveCompetitor(payload: CompetitorPayload, editingId: string | null): Observable<unknown> {
    return this.store.saveCompetitor(payload, editingId);
  }

  deleteCompetitor(c: StartupCompetitor): void { this.store.deleteCompetitor(c); }

  saveMemberProfile(payload: MemberProfilePayload): Observable<void> {
    return this.store.saveMemberProfile(payload);
  }
}
