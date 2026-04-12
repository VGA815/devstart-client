import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../core/auth/auth.service';
import { ApplicationService } from './application.service';
import { Application } from '../../../shared/models/application.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { ProfileService } from '../../startups/profile.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { formatMoney, formatRelativeTime } from '../../../shared/utils/format.utils';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [SkeletonComponent, AvatarComponent],
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly svc = inject(ApplicationService);
  private readonly profileSvc = inject(ProfileService);

  readonly loading = signal(true);
  readonly applications = signal<Application[]>([]);
  readonly applicantAvatars = signal<Map<string, string | null>>(new Map());

  constructor() {
    inject(Title).setTitle('Входящие заявки — DevStart');
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }

    this.svc.getIncoming(user.id).subscribe({
      next: list => {
        this.applications.set(list);
        this.loading.set(false);
        // Load applicant avatars in parallel (best-effort)
        const uniqueIds = [...new Set(list.map(a => a.applicantProfileId).filter(Boolean))];
        if (uniqueIds.length > 0) {
          forkJoin(
            Object.fromEntries(
              uniqueIds.map(id => [id, this.profileSvc.getProfile(id).pipe(catchError(() => of(null)))])
            )
          ).subscribe(map => {
            const avatars = new Map<string, string | null>();
            for (const [id, profile] of Object.entries(map)) {
              avatars.set(id, profile?.avatarId ?? null);
            }
            this.applicantAvatars.set(avatars);
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  getApplicantAvatarId(profileId: string): string | null {
    return this.applicantAvatars().get(profileId) ?? null;
  }

  accept(app: Application): void {
    this.svc.accept(app.id).subscribe({
      next: () => this.applications.update(list => list.filter(a => a.id !== app.id)),
    });
  }

  reject(app: Application): void {
    this.svc.reject(app.id).subscribe({
      next: () => this.applications.update(list => list.filter(a => a.id !== app.id)),
    });
  }

  // Template helpers (delegated to shared utils)
  protected readonly formatAmount = formatMoney;
  protected readonly formatDate = formatRelativeTime;
}
