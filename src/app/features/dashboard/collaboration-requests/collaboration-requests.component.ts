import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ExpertCollaborationRequestService } from '../../experts/expert-collaboration-request.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { CollabRequestRowComponent } from '../../../shared/components/collab-request-row/collab-request-row.component';
import {
  CollaborationRequestStatus, ExpertCollaborationRequest,
} from '../../../shared/models/expert-collaboration-request.model';
import { ALL_COLLABORATION_STATUSES, getCollaborationStatusLabel } from '../../../shared/utils/expert.utils';
import { optimisticPatch } from '../../../shared/utils/optimistic.utils';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-collaboration-requests',
  standalone: true,
  imports: [RouterLink, SkeletonComponent, CollabRequestRowComponent],
  templateUrl: './collaboration-requests.component.html',
  styleUrl: './collaboration-requests.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborationRequestsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly svc  = inject(ExpertCollaborationRequestService);

  readonly loading      = signal(true);
  readonly loadingMore  = signal(false);
  readonly requests     = signal<ExpertCollaborationRequest[]>([]);
  readonly statusFilter = signal<CollaborationRequestStatus | 'All'>('All');
  /** A full page back means there may be more; the API returns a page, not a total. */
  readonly hasMore      = signal(false);

  readonly statuses = ALL_COLLABORATION_STATUSES;

  private pageNumber = 1;

  constructor() {
    inject(Title).setTitle('Мои заявки на сотрудничество — DevStart');
  }

  ngOnInit(): void {
    this.reload();
  }

  selectStatus(value: string): void {
    this.statusFilter.set(value as CollaborationRequestStatus | 'All');
    this.reload();
  }

  loadMore(): void {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);
    this.pageNumber += 1;

    this.fetch().subscribe(list => {
      this.requests.update(current => [...current, ...list]);
      this.hasMore.set(list.length === PAGE_SIZE);
      this.loadingMore.set(false);
    });
  }

  accept(req: ExpertCollaborationRequest): void {
    this.patch(req, 'Accepted', this.svc.accept(req.id));
  }

  reject(req: ExpertCollaborationRequest): void {
    this.patch(req, 'Rejected', this.svc.reject(req.id));
  }

  withdraw(req: ExpertCollaborationRequest): void {
    this.patch(req, 'Withdrawn', this.svc.withdraw(req.id));
  }

  protected readonly getStatusLabel = getCollaborationStatusLabel;

  private patch(
    req: ExpertCollaborationRequest,
    status: CollaborationRequestStatus,
    request: ReturnType<ExpertCollaborationRequestService['accept']>,
  ): void {
    optimisticPatch(this.requests, r => r.id === req.id, { status }, request, () => this.reload());
  }

  private reload(): void {
    this.pageNumber = 1;
    this.loading.set(true);

    this.fetch().subscribe(list => {
      this.requests.set(list);
      this.hasMore.set(list.length === PAGE_SIZE);
      this.loading.set(false);
    });
  }

  private fetch() {
    const user = this.auth.user();
    if (!user) return of([] as ExpertCollaborationRequest[]);

    const status = this.statusFilter();

    return this.svc.getByExpertProfile(user.id, {
      status: status === 'All' ? undefined : status,
      pageNumber: this.pageNumber,
      pageSize: PAGE_SIZE,
    }).pipe(catchError(() => of([] as ExpertCollaborationRequest[])));
  }
}
