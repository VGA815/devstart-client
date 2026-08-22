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
import { StartupPatentsService } from '../startup-patents.service';
import { StartupPartnershipsService } from '../startup-partnerships.service';
import { StartupInvestorsService } from '../startup-investors.service';
import { StartupScoreService } from '../startup-score.service';
import { CommunityStandardsService } from '../community-standards.service';
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
import { StartupPatents, StartupPatentSuggestions } from '../../../shared/models/startup-patent.model';
import { StartupPartnership } from '../../../shared/models/startup-partnership.model';
import { StartupInvestor } from '../../../shared/models/startup-investor.model';
import { StartupScore, SuggestedTerms } from '../../../shared/models/startup-score.model';
import {
  CommunityDocument, CommunityDocumentSummary, CommunityDocumentType, CommunityStandards,
} from '../../../shared/models/community-standards.model';
import { CreateInvestmentApplicationRequestDto } from '../../../shared/models/dto/investment-application.dto';
import { UpdateStartupMemberProfileRequestDto } from '../../../shared/models/dto/startup.dto';

export type DetailTab = 'overview' | 'roadmap' | 'metrics' | 'team' | 'investors' | 'documents' | 'competitors' | 'partnerships' | 'patents' | 'scoring' | 'community';

export interface CompetitorPayload {
  name: string;
  website: string;
  description?: string;
  strengths_vs_us?: string;
  weaknesses_vs_us?: string;
}

export interface PartnershipPayload {
  partner_name: string;
  website: string;
  kind: number;
  description?: string;
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

  partnerships: StartupPartnership[];
  partnershipsLoading: boolean;
  deletingPartnershipId: string | null;

  // Записи ИС приходят одним ответом вместе со сверкой и заявленным ИНН: состояние считается на
  // чтении, поэтому отдельного «статуса проверки» тут нет и быть не может.
  patents: StartupPatents | null;
  patentsLoading: boolean;
  deletingPatentId: string | null;
  patentSuggestions: StartupPatentSuggestions | null;
  patentSuggestionsLoading: boolean;

  investors: StartupInvestor[];
  investorsLoading: boolean;
  investorProfilesMap: Map<string, Profile>;

  community: CommunityStandards | null;
  communityDocs: CommunityDocumentSummary[];
  communityLoading: boolean;
  // Тела документов подгружаются по клику и кэшируются на время просмотра страницы.
  communityBodies: Map<CommunityDocumentType, CommunityDocument>;
  openCommunityDoc: CommunityDocumentType | null;
  communityDocLoading: boolean;

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
  partnerships: [],
  partnershipsLoading: false,
  deletingPartnershipId: null,
  patents: null,
  patentsLoading: false,
  deletingPatentId: null,
  patentSuggestions: null,
  patentSuggestionsLoading: false,
  investors: [],
  investorsLoading: false,
  investorProfilesMap: new Map(),
  community: null,
  communityDocs: [],
  communityLoading: false,
  communityBodies: new Map(),
  openCommunityDoc: null,
  communityDocLoading: false,
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
    const partnershipsSvc    = inject(StartupPartnershipsService);
    const patentsSvc         = inject(StartupPatentsService);
    const startupInvestorsSvc = inject(StartupInvestorsService);
    const scoreSvc           = inject(StartupScoreService);
    const communitySvc       = inject(CommunityStandardsService);
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

        case 'partnerships':
          patchState(store, { partnershipsLoading: true });
          partnershipsSvc.getByStartupId(store.id()).pipe(
            catchError(() => of([]))
          ).subscribe(items => {
            patchState(store, { partnerships: items, partnershipsLoading: false });
          });
          break;

        case 'patents':
          patchState(store, { patentsLoading: true });
          patentsSvc.getByStartupId(store.id()).pipe(
            catchError(() => of(null))
          ).subscribe(data => {
            patchState(store, { patents: data, patentsLoading: false });
          });
          break;

        case 'investors':
          patchState(store, { investorsLoading: true });
          startupInvestorsSvc.getByStartup(store.id()).pipe(
            catchError(() => of([] as StartupInvestor[]))
          ).subscribe(items => {
            patchState(store, { investors: items, investorsLoading: false });
            const ids = items.map(i => i.profileId).filter(id => !!id);
            if (ids.length > 0) {
              forkJoin(
                Object.fromEntries(
                  ids.map(id => [id, profileSvc.getProfile(id).pipe(catchError(() => of(null)))])
                )
              ).subscribe(profileMap => {
                const map = new Map<string, Profile>();
                for (const [id, profile] of Object.entries(profileMap)) {
                  if (profile) map.set(id, profile as Profile);
                }
                patchState(store, { investorProfilesMap: map });
              });
            }
          });
          break;

        case 'community':
          patchState(store, { communityLoading: true });
          forkJoin({
            standards: communitySvc.getStandards(store.id()).pipe(catchError(() => of(null))),
            docs: communitySvc.getDocuments(store.id()).pipe(catchError(() => of([] as CommunityDocumentSummary[]))),
          }).subscribe(({ standards, docs }) => {
            patchState(store, { community: standards, communityDocs: docs, communityLoading: false });
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

      /** Открывает/сворачивает документ, подгружая markdown-тело при первом раскрытии. */
      toggleCommunityDoc(type: CommunityDocumentType): void {
        if (store.openCommunityDoc() === type) {
          patchState(store, { openCommunityDoc: null });
          return;
        }

        patchState(store, { openCommunityDoc: type });

        if (store.communityBodies().has(type)) return;

        patchState(store, { communityDocLoading: true });
        communitySvc.getDocument(store.id(), type).pipe(
          catchError(() => of(null))
        ).subscribe(doc => {
          if (doc) {
            const bodies = new Map(store.communityBodies());
            bodies.set(type, doc);
            patchState(store, { communityBodies: bodies });
          }
          patchState(store, { communityDocLoading: false });
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

      // Ошибку не глотаем: 403 (нужен Pro) и Valuation.InsufficientData — это не «ничего не
      // произошло», а два разных объяснимых исхода, которые форма показывает текстом.
      loadSuggestedTerms(instrument: number, amount: number): Observable<SuggestedTerms> {
        return scoreSvc.getSuggestedTerms(store.id(), instrument, amount);
      },

      // Тоже прокидываем: у отказа есть разбор по полям (ProblemDetails.errors), а «не удалось
      // отправить заявку» не подсказывает, что именно чинить.
      submitApplication(payload: InvestPayload): Observable<string> {
        return investAppSvc.create({ startup_id: store.id(), ...payload });
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

      // Ошибку прокидываем: у отказа есть разбор (409 «такой номер уже добавлен», лимит, формат
      // номера не для этого вида объекта), и «не удалось сохранить» не подсказывает, что чинить.
      savePatent(kind: number, number: string): Observable<unknown> {
        return patentsSvc.create({ startup_id: store.id(), kind, number }).pipe(tap(() => {
          loaded.delete('patents');
          loadTab('patents');
        }));
      },

      deletePatent(id: string): void {
        patchState(store, { deletingPatentId: id });
        patentsSvc.delete(id).subscribe({
          next: () => {
            patchState(store, { deletingPatentId: null });
            loaded.delete('patents');
            loadTab('patents');
          },
          error: () => patchState(store, { deletingPatentId: null }),
        });
      },

      // Обратный поиск по сверенному ИНН: «покажи всё, что реестр уже приписывает этому ИНН».
      // Грузится по кнопке, а не вместе со вкладкой — это вспомогательное действие для участника.
      loadPatentSuggestions(): void {
        patchState(store, { patentSuggestionsLoading: true });
        patentsSvc.getSuggestions(store.id()).pipe(
          catchError(() => of(null))
        ).subscribe(data => {
          patchState(store, { patentSuggestions: data, patentSuggestionsLoading: false });
        });
      },

      // Ошибку прокидываем: у отказа есть разбор (409 «этот домен уже добавлен», лимит записей),
      // и «не удалось сохранить» не подсказывает, что чинить.
      savePartnership(payload: PartnershipPayload, editingId: string | null): Observable<unknown> {
        const request$: Observable<unknown> = editingId
          ? partnershipsSvc.update(editingId, payload)
          : partnershipsSvc.create({ startup_id: store.id(), ...payload });

        return request$.pipe(tap(() => {
          loaded.delete('partnerships');
          loadTab('partnerships');
        }));
      },

      // Список правим на месте, как у конкурентов: счётчик проработанных считается из него же,
      // поэтому лишний запрос ничего не уточнил бы.
      deletePartnership(p: StartupPartnership): void {
        patchState(store, { deletingPartnershipId: p.id });
        partnershipsSvc.delete(p.id).subscribe({
          next: () => {
            patchState(store, {
              deletingPartnershipId: null,
              partnerships: store.partnerships().filter(x => x.id !== p.id),
            });
          },
          error: () => patchState(store, { deletingPartnershipId: null }),
        });
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

      addInvestor(profileId: string, isPublic: boolean): Observable<unknown> {
        return startupInvestorsSvc.create(store.id(), profileId, isPublic).pipe(
          tap(() => {
            loaded.delete('investors');
            loadTab('investors');
          })
        );
      },

      // Changes the CURRENT USER's visibility in this startup's investor list;
      // the backend answers 404 when the caller is not an investor of the startup.
      changeMyInvestorVisibility(isPublic: boolean): Observable<void> {
        return startupInvestorsSvc.changeVisibility(store.id(), isPublic).pipe(
          tap(() => {
            loaded.delete('investors');
            loadTab('investors');
          })
        );
      },
    };
  })
);
