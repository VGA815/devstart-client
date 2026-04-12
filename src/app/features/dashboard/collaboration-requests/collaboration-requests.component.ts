import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
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
import { optimisticPatch } from '../../../shared/utils/optimistic.utils';

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

  readonly loading       = signal(true);
  readonly hasProfile    = signal(true);          // optimistic — set to false on 4xx
  readonly requests      = signal<ExpertCollaborationRequest[]>([]);
  readonly statusFilter  = signal<CollaborationRequestStatus | 'All'>('All');

  readonly filtered = computed(() => {
    const f = this.statusFilter();
    if (f === 'All') return this.requests();
    return this.requests().filter(r => r.status === f);
  });

  constructor() {
    inject(Title).setTitle('Мои заявки на сотрудничество — DevStart');
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }

    this.svc.getByExpertProfile(user.id).pipe(catchError(err => {
      if (err?.status === 404) this.hasProfile.set(false);
      return of([] as ExpertCollaborationRequest[]);
    })).subscribe(list => {
      this.requests.set(list);
      this.loading.set(false);
    });
  }

  selectStatus(value: string): void {
    this.statusFilter.set(value as CollaborationRequestStatus | 'All');
  }

  withdraw(req: ExpertCollaborationRequest): void {
    optimisticPatch(
      this.requests,
      r => r.id === req.id,
      { status: 'Withdrawn' },
      this.svc.withdraw(req.id),
      () => this.ngOnInit(),
    );
  }
}
