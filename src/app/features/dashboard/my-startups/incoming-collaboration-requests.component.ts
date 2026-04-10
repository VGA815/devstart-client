import {
  Component, ChangeDetectionStrategy, Input, OnChanges, SimpleChanges, inject, signal,
} from '@angular/core';
import { catchError, of } from 'rxjs';
import { ExpertCollaborationRequestService } from '../../experts/expert-collaboration-request.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { CollabRequestRowComponent } from '../../../shared/components/collab-request-row/collab-request-row.component';
import { ExpertCollaborationRequest } from '../../../shared/models/expert-collaboration-request.model';
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
    this.svc.getByStartup(this.startupId)
      .pipe(catchError(() => of([] as ExpertCollaborationRequest[])))
      .subscribe(list => {
        const ordered = [...list].sort((a, b) => {
          if (a.status === 'Pending' && b.status !== 'Pending') return -1;
          if (b.status === 'Pending' && a.status !== 'Pending') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        this.requests.set(ordered);
        this.loading.set(false);
      });
  }

  accept(req: ExpertCollaborationRequest): void {
    optimisticPatch(
      this.requests,
      r => r.id === req.id,
      { status: 'Accepted' },
      this.svc.accept(req.id),
      () => this.load(),
    );
  }

  reject(req: ExpertCollaborationRequest): void {
    optimisticPatch(
      this.requests,
      r => r.id === req.id,
      { status: 'Rejected' },
      this.svc.reject(req.id),
      () => this.load(),
    );
  }
}
