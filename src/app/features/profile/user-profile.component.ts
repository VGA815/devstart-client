import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal, computed,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileService } from '../startups/profile.service';
import { StartupService } from '../startups/startup.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { Profile } from '../../shared/models/profile.model';
import { Startup } from '../../shared/models/startup.model';
import { getStageBadgeClass, getStageBadgeLabel } from '../../shared/utils/startup.utils';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, AvatarComponent, SkeletonComponent],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileComponent implements OnInit {
  private readonly route      = inject(ActivatedRoute);
  private readonly router     = inject(Router);
  private readonly auth       = inject(AuthService);
  private readonly profileSvc = inject(ProfileService);
  private readonly startupSvc = inject(StartupService);
  private readonly title      = inject(Title);

  readonly loading  = signal(true);
  readonly notFound = signal(false);
  readonly profile  = signal<Profile | null>(null);
  readonly startups = signal<Startup[]>([]);

  readonly canMessage = computed(() => {
    const user = this.auth.user();
    const p    = this.profile();
    return !!user && !!p && user.id !== p.userId;
  });

  readonly isOwn = computed(() => {
    const user = this.auth.user();
    const p    = this.profile();
    return !!user && !!p && user.id === p.userId;
  });

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id')!;

    forkJoin({
      profile:  this.profileSvc.getProfile(userId).pipe(catchError(() => of(null))),
      startups: this.startupSvc.getStartupsByProfile(userId).pipe(catchError(() => of([]))),
    }).subscribe(({ profile, startups }) => {
      if (!profile) {
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }
      this.profile.set(profile as Profile);
      this.startups.set(startups as Startup[]);
      this.loading.set(false);

      const name = (profile as Profile).name ?? userId;
      this.title.setTitle(`${name} — DevStart`);
    });
  }

  openChat(): void {
    const p = this.profile();
    if (!p) return;
    this.router.navigate(['/dashboard/messages'], {
      queryParams: { recipientId: p.userId, recipientType: 0 },
    });
  }

  displayName(): string {
    return this.profile()?.name ?? '';
  }

  socialLinks(): string[] {
    return this.profile()?.socialMediaLinks ?? [];
  }

  socialLinkLabel(url: string): string {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  }

  protected readonly getStageBadgeClass  = getStageBadgeClass;
  protected readonly getStageBadgeLabel  = getStageBadgeLabel;
}
