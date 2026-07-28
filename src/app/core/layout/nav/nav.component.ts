import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { switchMap, map, catchError, of, filter } from 'rxjs';
import { toObservable, toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../auth/auth.service';
import { UserPreferencesService } from '../../preferences/user-preferences.service';
import { ProfileService } from '../../../features/startups/profile.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AvatarComponent],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavComponent {
  protected readonly auth = inject(AuthService);
  protected readonly prefs = inject(UserPreferencesService);
  private readonly profileSvc = inject(ProfileService);
  private readonly router = inject(Router);

  protected readonly isLight = computed(() => this.prefs.effective() === 'light');

  readonly menuOpen = signal(false);

  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void { this.menuOpen.set(false); }

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.menuOpen.set(false));
  }


  readonly profileAvatarId = toSignal(
    toObservable(this.auth.user).pipe(
      switchMap(user =>
        user
          ? this.profileSvc.getProfile(user.id).pipe(
              map(p => p.avatarId),
              catchError(() => of(null)),
            )
          : of(null)
      ),
    ),
    { initialValue: null },
  );
}
