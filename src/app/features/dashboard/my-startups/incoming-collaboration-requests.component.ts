import {
  Component, ChangeDetectionStrategy, Input, OnChanges, SimpleChanges, inject, signal,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { ExpertCollaborationRequestService } from '../../experts/expert-collaboration-request.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { CollabRequestRowComponent } from '../../../shared/components/collab-request-row/collab-request-row.component';
import {
  CollaborationRequestStatus, ExpertCollaborationRequest,
} from '../../../shared/models/expert-collaboration-request.model';
import { optimisticPatch } from '../../../shared/utils/optimistic.utils';

@Component({
  selector: 'app-incoming-collaboration-requests',
  standalone: true,
  imports: [SkeletonComponent, CollabRequestRowComponent],
  templateUrl: './incoming-collaboration-requests.component.html',
  styleUrl: './incoming-collaboration-requests.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomingCollaborationRequestsComponent implements OnChanges {
  @Input({ required: true }) startupId!: string;

  private readonly svc = inject(ExpertCollaborationRequestService);

  readonly loading  = signal(true);
  readonly requests = signal<ExpertCollaborationRequest[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startupId'] && this.startupId) this.load();
  }

  private load(): void {
    this.loading.set(true);
    // The API already returns Pending first, newest first within each group.
    this.svc.getByStartup(this.startupId)
      .pipe(catchError(() => of([] as ExpertCollaborationRequest[])))
      .subscribe(list => {
        this.requests.set(list);
        this.loading.set(false);
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

  private patch(
    req: ExpertCollaborationRequest,
    status: CollaborationRequestStatus,
    request: ReturnType<ExpertCollaborationRequestService['accept']>,
  ): void {
    optimisticPatch(this.requests, r => r.id === req.id, { status }, request, () => this.load());
  }
}
