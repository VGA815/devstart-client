import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { OAuthService } from '../../../core/auth/oauth.service';
import { ProfileService } from '../../startups/profile.service';
import { AvatarUploadComponent } from '../../../shared/components/avatar-upload/avatar-upload.component';
import { OAuthProvider } from '../../../shared/models/dto/auth.dto';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, AvatarUploadComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly title          = inject(Title);
  protected readonly auth         = inject(AuthService);
  private readonly oauth          = inject(OAuthService);
  private readonly profileService = inject(ProfileService);

  readonly saveSuccess      = signal(false);
  readonly saveError        = signal<string | null>(null);
  readonly loading          = signal(false);
  readonly selectedAvatarId = signal<string | null>(null);

  readonly passwordLoading  = signal(false);
  readonly passwordSuccess  = signal(false);
  readonly passwordError    = signal<string | null>(null);

  readonly oauthBusy        = signal<OAuthProvider | null>(null);
  readonly oauthMessage     = signal<{ kind: 'ok' | 'err'; text: string } | null>(null);

  linkProvider(provider: OAuthProvider): void {
    if (this.oauthBusy()) return;
    this.oauthMessage.set(null);
    this.oauthBusy.set(provider);

    const redirectUri = this.oauth.buildRedirectUri(provider);
    this.oauth.linkStart(provider, redirectUri).subscribe({
      next: res => { window.location.href = res.authorizationUrl; },
      error: () => {
        this.oauthBusy.set(null);
        this.oauthMessage.set({ kind: 'err', text: 'Не удалось начать привязку аккаунта.' });
      },
    });
  }

  unlinkProvider(provider: OAuthProvider): void {
    if (this.oauthBusy()) return;
    this.oauthMessage.set(null);
    this.oauthBusy.set(provider);

    this.oauth.unlink(provider).subscribe({
      next: () => {
        this.oauthBusy.set(null);
        this.oauthMessage.set({
          kind: 'ok',
          text: `Аккаунт ${providerLabel(provider)} отвязан.`,
        });
        setTimeout(() => this.oauthMessage.set(null), 3000);
      },
      error: (err: HttpErrorResponse) => {
        this.oauthBusy.set(null);
        const code = err.error?.code ?? err.error?.error?.code ?? '';
        if (code === 'CannotUnlinkLastCredential') {
          this.oauthMessage.set({
            kind: 'err',
            text: 'Нельзя отвязать единственный способ входа. Сначала задайте пароль.',
          });
        } else if (err.status === 404) {
          this.oauthMessage.set({
            kind: 'err',
            text: `Аккаунт ${providerLabel(provider)} не привязан.`,
          });
        } else {
          this.oauthMessage.set({ kind: 'err', text: 'Не удалось отвязать аккаунт.' });
        }
      },
    });
  }

  private profileExists = false;

  readonly isPublic            = signal(true);
  readonly isAvailableForHire  = signal(false);

  readonly socialLinksRaw = signal('');

  readonly notifyApplications = signal(true);
  readonly notifyMessages     = signal(true);
  readonly notifyPlatform     = signal(false);

  readonly profileForm = this.fb.group({
    name:     [''],
    username: ['', [Validators.required, Validators.minLength(3)]],
    bio:      [''],
    url:      [''],
  });

  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  get passwordMismatch(): boolean {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    return !!confirmPassword && newPassword !== confirmPassword;
  }

  fieldError(form: 'profile' | 'password', name: string): string | null {
    const ctrl = form === 'profile'
      ? this.profileForm.get(name)
      : this.passwordForm.get(name);
    if (!ctrl?.touched || !ctrl.invalid) return null;
    if (ctrl.hasError('required'))  return 'Обязательное поле';
    if (ctrl.hasError('minlength')) return `Минимум ${ctrl.errors?.['minlength']?.requiredLength} символов`;
    return null;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    const user = this.auth.user();
    if (!user) return;

    const v = this.profileForm.getRawValue();
    const socialMediaLinks = this.socialLinksRaw()
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    this.loading.set(true);
    this.saveError.set(null);

    const body = {
      user_id:               user.id,
      name:                  v.name   || undefined,
      bio:                   v.bio    || undefined,
      url:                   v.url    || undefined,
      is_public:             this.isPublic(),
      is_available_for_hire: this.isAvailableForHire(),
      social_media_links:    socialMediaLinks,
      avatar_id:             this.selectedAvatarId() ?? undefined,
    };

    const onNext = () => {
      this.profileExists = true;
      this.loading.set(false);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    };
    const onError = () => {
      this.loading.set(false);
      this.saveError.set('Не удалось сохранить профиль. Попробуйте снова.');
    };

    if (this.profileExists) {
      this.profileService.updateProfile(body).subscribe({ next: onNext, error: onError });
    } else {
      this.profileService.createProfile(body).subscribe({ next: onNext, error: onError });
    }
  }

  savePassword(): void {
    if (this.passwordForm.invalid || this.passwordMismatch) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordLoading.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);

    this.auth.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        this.passwordLoading.set(false);
        this.passwordSuccess.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.passwordSuccess.set(false), 4000);
      },
      error: (err: HttpErrorResponse) => {
        this.passwordLoading.set(false);
        const code = err.error?.code ?? err.error?.error?.code ?? '';
        if (code === 'InvalidCurrentPassword' || err.status === 400) {
          this.passwordError.set('Текущий пароль неверен.');
        } else if (code === 'PasswordNotSet' || err.status === 409) {
          this.passwordError.set('Пароль ещё не задан — войдите через провайдера и используйте «Забыли пароль?», чтобы создать его.');
        } else {
          this.passwordError.set('Не удалось изменить пароль. Попробуйте позже.');
        }
      },
    });
  }

  constructor() {
    this.title.setTitle('Настройки — DevStart');
    const user = this.auth.user();
    if (user) {
      this.profileForm.patchValue({ username: user.username });
    }
  }

  protected providerLabel(p: OAuthProvider): string {
    return providerLabel(p);
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) return;
    this.profileService.getProfile(user.id).subscribe({
      next: profile => {
        this.profileExists = true;
        this.selectedAvatarId.set(profile.avatarId);
        this.isPublic.set(profile.isPublic);
        this.isAvailableForHire.set(profile.isAvailableForHire);
        this.socialLinksRaw.set(profile.socialMediaLinks.join('\n'));
        this.profileForm.patchValue({
          name: profile.name ?? '',
          bio:  profile.bio  ?? '',
          url:  profile.url  ?? '',
        });
      },
      error: () => { /* profile may not exist yet*/ },
    });
  }
}

function providerLabel(p: OAuthProvider): string {
  return p === 'google' ? 'Google' : 'GitHub';
}
