import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../../startups/profile.service';
import { StartupService } from '../../startups/startup.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Profile } from '../../../shared/models/profile.model';
import { Startup } from '../../../shared/models/startup.model';
import { getStageBadgeClass, getStageBadgeLabel } from '../../../shared/utils/startup.utils';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [RouterLink, AvatarComponent, SkeletonComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly profileSvc = inject(ProfileService);
  private readonly startupSvc = inject(StartupService);
  private readonly title = inject(Title);

  readonly loading = signal(true);
  readonly profile = signal<Profile | null>(null);
  readonly startups = signal<Startup[]>([]);

  ngOnInit(): void {
    this.title.setTitle('Мой профиль — DevStart');
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }

    forkJoin({
      profile:  this.profileSvc.getProfile(user.id).pipe(catchError(() => of(null))),
      startups: this.startupSvc.getStartupsByProfile(user.id).pipe(catchError(() => of([]))),
    }).subscribe(({ profile, startups }) => {
      this.profile.set(profile as Profile | null);
      this.startups.set(startups as Startup[]);
      this.loading.set(false);
    });
  }

  displayName(): string {
    const p = this.profile();
    const u = this.auth.user();
    return p?.name || u?.username || '';
  }

  socialLinks(): string[] {
    return this.profile()?.socialMediaLinks ?? [];
  }

  socialLinkLabel(url: string): string {
    try {
      const host = new URL(url).hostname.replace('www.', '');
      return host;
    } catch {
      return url;
    }
  }

  protected readonly getStageBadgeClass = getStageBadgeClass;
  protected readonly getStageBadgeLabel = getStageBadgeLabel;
}
