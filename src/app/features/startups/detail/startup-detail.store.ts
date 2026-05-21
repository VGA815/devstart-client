import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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

import { Startup, StartupMember } from '../../../shared/models/startup.model';
import { Profile } from '../../../shared/models/profile.model';
import { InvestorProfile } from '../../../shared/models/investor-profile.model';
import { StartupRoadmapItem } from '../../../shared/models/startup-roadmap.model';
import { StartupMetric } from '../../../shared/models/startup-metric.model';
import { StartupDocument } from '../../../shared/models/startup-document.model';
import { StartupCompetitor } from '../../../shared/models/startup-competitor.model';
import { StartupScore, SuggestedTerms } from '../../../shared/models/startup-score.model';
import { CreateInvestmentApplicationRequestDto } from '../../../shared/models/dto/investment-application.dto';
import { UpdateStartupMemberProfileRequestDto } from '../../../shared/models/dto/startup.dto';

export type DetailTab = 'overview' | 'roadmap' | 'metrics' | 'team' | 'documents' | 'competitors' | 'scoring';

export interface CompetitorPayload {
  name: string;
  website?: string;
  description?: string;
  strengths_vs_us?: string;
  weaknesses_vs_us?: string;
}

export type InvestPayload = Omit<CreateInvestmentApplicationRequestDto, 'startup_id'>;

export type MemberProfilePayload = Omit<UpdateStartupMemberProfileRequestDto, 'startup_id'>;

interface StartupDetailState {
  id: string;
  startup: Startup | null;
  loading: boolean;
  activeTab: DetailTab;

  score: StartupScore | null;
  scoreLoading: boolean;
  // null = no error, 403 = forbidden, 404/other = no data
  scoreErrorStatus: number | null;

  followersCount: number;
  isFollowing: boolean;
  followLoading: boolean;

  roadmap: StartupRoadmapItem[];
  roadmapLoading: boolean;
  docs: StartupDocument[];
  docsLoading: boolean;
  metrics: StartupMetric[];
  metricsLoading: boolean;
  members: StartupMember[];
  membersLoading: boolean;
  memberProfiles: Map<string, Profile>;

  competitors: StartupCompetitor[];
  competitorsLoading: boolean;
  deletingCompetitorId: string | null;

  // undefined = not yet loaded; null = no profile; InvestorProfile = has profile
  investorProfile: InvestorProfile | null | undefined;
}

const initialState: StartupDetailState = {
  id: '',
  startup: null,
  loading: true,
  activeTab: 'overview',
  score: null,
  scoreLoading: false,
  scoreErrorStatus: null,
  followersCount: 0,
  isFollowing: false,
  followLoading: false,
  roadmap: [],
  roadmapLoading: false,
  docs: [],
  docsLoading: false,
  metrics: [],
  metricsLoading: false,
  members: [],
  membersLoading: false,
  memberProfiles: new Map(),
  competitors: [],
  competitorsLoading: false,
  deletingCompetitorId: null,
  investorProfile: undefined,
};

export const StartupDetailStore = signalStore(
  withState(initialState),

  withComputed((store, auth = inject(AuthService)) => ({
    isFounderOrAdmin: computed(() => {
      const userId = auth.user()?.id;
      if (!userId) return false;
      return store.members().some(
        m => m.profileId === userId && (m.role === 'Founder' || m.role === 'Administration')
      );
    }),
    myMember: computed(() => {
      const userId = auth.user()?.id;
      if (!userId) return null;
      return store.members().find(m => m.profileId === userId) ?? null;
    }),
  })),

  withMethods(store => {
    const startupSvc         = inject(StartupService);
    const roadmapSvc         = inject(StartupRoadmapService);
    const docsSvc            = inject(StartupDocumentsService);
    const metricsSvc         = inject(StartupMetricsService);
    const membersSvc         = inject(StartupMembersService);
    const followersSvc       = inject(StartupFollowersService);
    const competitorsSvc     = inject(StartupCompetitorsService);
    const scoreSvc           = inject(StartupScoreService);
    const profileSvc         = inject(ProfileService);
    const authSvc            = inject(AuthService);
    const investorProfileSvc = inject(InvestorProfileService);
    const investAppSvc       = inject(InvestmentApplicationService);

    const loaded = new Set<DetailTab>();
    let investorProfileLoaded = false;

    function loadScore(): void {
      patchState(store, { scoreLoading: true, scoreErrorStatus: null });
      scoreSvc.getScore(store.id()).pipe(
        catchError((err: HttpErrorResponse) => {
          patchState(store, { scoreErrorStatus: err.status ?? 0 });
          return of(null);
        })
      ).subscribe(s => patchState(store, { score: s, scoreLoading: false }));
    }

    function loadFollowers(): void {
      followersSvc.getFollowers(store.id()).subscribe({
        next: followers => {
          const userId = authSvc.user()?.id;
          patchState(store, {
            followersCount: followers.length,
            isFollowing: !!userId && followers.some(f => f.profileId === userId),
          });
        },
        error: () => { },
      });
    }

    function loadTab(tab: DetailTab): void {
      if (loaded.has(tab)) return;
      loaded.add(tab);

      switch (tab) {
        case 'roadmap':
          patchState(store, { roadmapLoading: true });
          roadmapSvc.getRoadmapItems(store.id()).subscribe({
            next: items => patchState(store, { roadmap: items, roadmapLoading: false }),
            error: () => patchState(store, { roadmapLoading: false }),
          });
          break;

        case 'metrics':
          patchState(store, { metricsLoading: true });
          metricsSvc.getMetrics(store.id()).subscribe({
            next: items => patchState(store, { metrics: items, metricsLoading: false }),
            error: () => patchState(store, { metricsLoading: false }),
          });
          break;

        case 'team':
          patchState(store, { membersLoading: true });
          membersSvc.getMembers(store.id()).subscribe({
            next: items => {
              patchState(store, { members: items });
              const validItems = items.filter(m => !!m.profileId);
              if (validItems.length > 0) {
                forkJoin(
                  Object.fromEntries(
                    validItems.map(m => [m.profileId, profileSvc.getProfile(m.profileId).pipe(catchError(() => of(null)))])
                  )
                ).subscribe(profileMap => {
                  const map = new Map<string, Profile>();
                  for (const [id, profile] of Object.entries(profileMap)) {
                    if (profile) map.set(id, profile as Profile);
                  }
                  patchState(store, { memberProfiles: map });
                });
              }
              patchState(store, { membersLoading: false });
            },
            error: () => patchState(store, { membersLoading: false }),
          });
          break;

        case 'documents':
          patchState(store, { docsLoading: true });
          docsSvc.getDocuments(store.id()).subscribe({
            next: items => patchState(store, { docs: items, docsLoading: false }),
            error: () => patchState(store, { docsLoading: false }),
          });
          break;

        case 'competitors':
          patchState(store, { competitorsLoading: true });
          competitorsSvc.getByStartupId(store.id()).pipe(
            catchError(() => of([]))
          ).subscribe(items => {
            patchState(store, { competitors: items, competitorsLoading: false });
          });
          break;
      }
    }

    return {
      init(id: string): void {
        patchState(store, { id, loading: true });
        startupSvc.getStartup(id).subscribe({
          next: s => {
            patchState(store, { startup: s, loading: false });
            loadTab('metrics');
            loadFollowers();
            if (authSvc.user()) {
              loadScore();
              loadTab('team');
            }
          },
          error: () => patchState(store, { loading: false }),
        });
      },

      setTab(tab: DetailTab): void {
        patchState(store, { activeTab: tab });
        loadTab(tab);
      },

      toggleFollow(): void {
        const user = authSvc.user();
        if (!user || store.followLoading()) return;

        patchState(store, { followLoading: true });
        const wasFollowing = store.isFollowing();

        patchState(store, {
          isFollowing: !wasFollowing,
          followersCount: store.followersCount() + (wasFollowing ? -1 : 1),
        });

        const request$ = wasFollowing
          ? followersSvc.unfollow(store.id())
          : followersSvc.follow(store.id(), user.id);

        request$.subscribe({
          next: () => patchState(store, { followLoading: false }),
          error: () => patchState(store, {
            isFollowing: wasFollowing,
            followersCount: store.followersCount() + (wasFollowing ? 1 : -1),
            followLoading: false,
          }),
        });
      },

      prepareInvest(): void {
        const user = authSvc.user();
        if (user && !investorProfileLoaded) {
          investorProfileLoaded = true;
          investorProfileSvc.getById(user.id).pipe(
            catchError(() => of(null))
          ).subscribe(p => patchState(store, { investorProfile: p }));
        }
        loadTab('roadmap');
      },

      loadSuggestedTerms(instrument: number, amount: number): Observable<SuggestedTerms | null> {
        return scoreSvc.getSuggestedTerms(store.id(), instrument, amount).pipe(
          catchError(() => of(null))
        );
      },

      submitApplication(payload: InvestPayload): Observable<string | null> {
        return investAppSvc.create({ startup_id: store.id(), ...payload }).pipe(
          catchError(() => of(null))
        );
      },

      saveCompetitor(payload: CompetitorPayload, editingId: string | null): Observable<unknown> {
        const request$: Observable<unknown> = editingId
          ? competitorsSvc.update(editingId, payload)
          : competitorsSvc.create({ startup_id: store.id(), ...payload });

        return request$.pipe(tap(() => {
          loaded.delete('competitors');
          loadTab('competitors');
        }));
      },

      deleteCompetitor(c: StartupCompetitor): void {
        patchState(store, { deletingCompetitorId: c.id });
        competitorsSvc.delete(c.id).subscribe({
          next: () => patchState(store, {
            deletingCompetitorId: null,
            competitors: store.competitors().filter(x => x.id !== c.id),
          }),
          error: () => patchState(store, { deletingCompetitorId: null }),
        });
      },

      saveMemberProfile(payload: MemberProfilePayload): Observable<void> {
        return membersSvc.updateMemberProfile({ startup_id: store.id(), ...payload }).pipe(
          tap(() => {
            loaded.delete('team');
            loadTab('team');
          })
        );
      },
    };
  })
);
