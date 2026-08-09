import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { OAuthService } from '../../../core/auth/oauth.service';
import { TwoFactorService } from '../../../core/auth/two-factor.service';
import { SessionsService } from '../../../core/auth/sessions.service';
import { DeviceTrustStore } from '../../../core/auth/device-trust.store';
import { UserPreferencesService } from '../../../core/preferences/user-preferences.service';
import { ProfileService } from '../../startups/profile.service';
import { AvatarUploadComponent } from '../../../shared/components/avatar-upload/avatar-upload.component';
import { QrCodeComponent } from '../../../shared/components/qr-code/qr-code.component';
import { OAuthProvider } from '../../../shared/models/dto/auth.dto';
import {
  SessionDto,
  TrustedDeviceDto,
  SecuritySettingsDto,
  TwoFactorStrictness,
  UpdateSecuritySettingsRequestDto,
} from '../../../shared/models/dto/session.dto';
import { ThemePreference } from '../../../shared/models/user-preference.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, AvatarUploadComponent, QrCodeComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
  private readonly fb             = inject(FormBuilder);
  private readonly title          = inject(Title);
  protected readonly auth         = inject(AuthService);
  private readonly oauth          = inject(OAuthService);
  private readonly twoFactorSvc   = inject(TwoFactorService);
  // Named with a trailing underscore: `sessions` is the signal holding the list.
  private readonly sessions_      = inject(SessionsService);
  private readonly deviceTrust    = inject(DeviceTrustStore);
  private readonly profileService = inject(ProfileService);
  protected readonly prefs        = inject(UserPreferencesService);

  readonly saveSuccess      = signal(false);
  readonly saveError        = signal<string | null>(null);
  readonly loading          = signal(false);
  readonly selectedAvatarId = signal<string | null>(null);

  readonly passwordLoading  = signal(false);
  readonly passwordSuccess  = signal(false);
  readonly passwordError    = signal<string | null>(null);

  readonly oauthBusy        = signal<OAuthProvider | null>(null);
  readonly oauthMessage     = signal<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // 2FA (TOTP). twoFactorEnabled comes from GET users/{id} via auth.user().
  // tfaMode: which inline flow is open; recovery codes are shown exactly once after enable/regenerate.
  readonly tfaMode          = signal<'idle' | 'enroll' | 'disable' | 'regenerate'>('idle');
  readonly tfaBusy          = signal(false);
  readonly tfaError         = signal<string | null>(null);
  readonly tfaSuccess       = signal<string | null>(null);
  readonly tfaSecret        = signal<string | null>(null);
  readonly tfaOtpAuthUri    = signal<string | null>(null);
  readonly tfaCode          = signal('');
  readonly tfaPassword      = signal('');
  readonly tfaRecoveryCodes = signal<string[] | null>(null);
  readonly tfaCodesCopied   = signal(false);

  readonly twoFactorEnabled = computed(() => this.auth.user()?.twoFactorEnabled ?? false);

  // ——— Строгость 2FA, сессии и доверенные устройства ———

  readonly security        = signal<SecuritySettingsDto | null>(null);
  readonly securityBusy    = signal(false);
  readonly securityError   = signal<string | null>(null);
  readonly securitySuccess = signal<string | null>(null);

  readonly sessions       = signal<SessionDto[]>([]);
  readonly devices        = signal<TrustedDeviceDto[]>([]);
  readonly sessionsLoaded = signal(false);
  readonly sessionsBusy   = signal(false);
  readonly sessionsError  = signal<string | null>(null);

  /** Id of this browser's own trusted device, so its row can be labelled. */
  readonly currentDeviceId = computed(() => this.deviceTrust.deviceId());

  readonly strictnessOptions: { value: TwoFactorStrictness; label: string; hint: string }[] = [
    {
      value: 0,
      label: 'Запрашивать код при каждом входе',
      hint: 'Самый строгий режим. Доверенные устройства не используются.',
    },
    {
      value: 1,
      label: 'Не спрашивать код на доверенном устройстве',
      hint: 'После подтверждения кода браузер запоминается на выбранный срок.',
    },
    {
      value: 2,
      label: 'Не спрашивать код, пока я в той же сети',
      hint: 'Как выше, но при смене сети код запросят снова. На мобильном интернете IP меняется часто — код будет запрашиваться почти каждый раз.',
    },
  ];

  loadSecurity(): void {
    this.sessions_.getSecurity().subscribe({
      next: settings => this.security.set(settings),
      error: () => this.securityError.set('Не удалось загрузить настройки безопасности.'),
    });
  }

  loadSessionsAndDevices(): void {
    this.sessionsBusy.set(true);
    this.sessionsError.set(null);

    forkJoin({
      sessions: this.sessions_.listSessions(),
      devices:  this.sessions_.listDevices(),
    }).subscribe({
      next: ({ sessions, devices }) => {
        this.sessions.set(sessions);
        this.devices.set(devices);
        this.sessionsLoaded.set(true);
        this.sessionsBusy.set(false);
      },
      error: () => {
        this.sessionsBusy.set(false);
        this.sessionsError.set('Не удалось загрузить сессии и устройства.');
      },
    });
  }

  setStrictness(value: TwoFactorStrictness): void {
    const current = this.security();
    if (!current || this.securityBusy()) return;
    this.saveSecurity({ ...current, strictness: value });
  }

  setTrustDuration(value: string): void {
    const current = this.security();
    const days = Number(value);
    if (!current || this.securityBusy() || Number.isNaN(days)) return;
    this.saveSecurity({ ...current, trustDurationDays: days });
  }

  toggleNewDeviceEmail(): void {
    const current = this.security();
    if (!current || this.securityBusy()) return;
    this.saveSecurity({ ...current, notifyOnNewDeviceLogin: !current.notifyOnNewDeviceLogin });
  }

  private saveSecurity(next: SecuritySettingsDto): void {
    this.securityBusy.set(true);
    this.securityError.set(null);
    this.securitySuccess.set(null);

    const body: UpdateSecuritySettingsRequestDto = {
      strictness:                 next.strictness,
      trust_duration_days:        next.trustDurationDays,
      notify_on_new_device_login: next.notifyOnNewDeviceLogin,
    };

    this.sessions_.updateSecurity(body).subscribe({
      next: () => {
        this.securityBusy.set(false);
        this.security.set(next);
        this.securitySuccess.set('Настройки сохранены.');
        setTimeout(() => this.securitySuccess.set(null), 3000);
        // A policy change revokes every trusted device server-side; reflect that in the list.
        if (this.sessionsLoaded()) this.loadSessionsAndDevices();
      },
      error: () => {
        this.securityBusy.set(false);
        this.securityError.set('Не удалось сохранить настройки безопасности.');
      },
    });
  }

  revokeSession(sessionId: string): void {
    if (this.sessionsBusy()) return;
    this.sessionsBusy.set(true);
    this.sessions_.revokeSession(sessionId).subscribe({
      next: () => { this.sessionsBusy.set(false); this.loadSessionsAndDevices(); },
      error: () => this.failSessions(),
    });
  }

  revokeOtherSessions(): void {
    if (this.sessionsBusy()) return;
    this.sessionsBusy.set(true);
    this.sessions_.revokeAllSessions(false).subscribe({
      next: () => { this.sessionsBusy.set(false); this.loadSessionsAndDevices(); },
      error: () => this.failSessions(),
    });
  }

  revokeDevice(deviceId: string): void {
    if (this.sessionsBusy()) return;
    this.sessionsBusy.set(true);
    this.sessions_.revokeDevice(deviceId).subscribe({
      next: () => { this.sessionsBusy.set(false); this.loadSessionsAndDevices(); },
      error: () => this.failSessions(),
    });
  }

  revokeAllDevices(): void {
    if (this.sessionsBusy()) return;
    this.sessionsBusy.set(true);
    this.sessions_.revokeAllDevices().subscribe({
      next: () => { this.sessionsBusy.set(false); this.loadSessionsAndDevices(); },
      error: () => this.failSessions(),
    });
  }

  private failSessions(): void {
    this.sessionsBusy.set(false);
    this.sessionsError.set('Не удалось выполнить операцию. Попробуйте позже.');
  }

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

  // Настройки (тема + флаг уведомлений) живут в UserPreferencesService: их же
  // читает переключатель в шапке. Здесь остаётся только UI-состояние страницы.
  readonly prefsSaving = signal(false);
  readonly prefsError  = signal<string | null>(null);

  readonly themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'Dark',   label: 'Тёмная' },
    { value: 'Light',  label: 'Светлая' },
    { value: 'System', label: 'Как в системе' },
  ];

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

  // ——— 2FA (TOTP) ———

  startTfaEnroll(): void {
    if (this.tfaBusy()) return;
    this.resetTfaFlow('enroll');
    this.tfaBusy.set(true);
    this.twoFactorSvc.setup().subscribe({
      next: data => {
        this.tfaSecret.set(data.secret);
        this.tfaOtpAuthUri.set(data.otpAuthUri);
        this.tfaBusy.set(false);
      },
      error: () => {
        this.tfaBusy.set(false);
        this.tfaError.set('Не удалось начать настройку 2FA. Попробуйте позже.');
      },
    });
  }

  confirmTfaEnroll(): void {
    const code = this.tfaCode().trim();
    if (!code || this.tfaBusy()) return;
    this.tfaBusy.set(true);
    this.tfaError.set(null);
    this.twoFactorSvc.enable(code).subscribe({
      next: codes => {
        this.tfaBusy.set(false);
        this.tfaRecoveryCodes.set(codes);
        this.tfaCode.set('');
        this.refreshUser();
        // Enabling 2FA revokes the other sessions, so the list on screen is already stale.
        this.loadSessionsAndDevices();
      },
      error: (err: HttpErrorResponse) => this.failTfa(err),
    });
  }

  startTfaDisable(): void    { this.resetTfaFlow('disable'); }
  startTfaRegenerate(): void { this.resetTfaFlow('regenerate'); }

  confirmTfaDisable(): void {
    const code = this.tfaCode().trim();
    if (!code || this.tfaBusy()) return;
    this.tfaBusy.set(true);
    this.tfaError.set(null);
    this.twoFactorSvc.disable(this.tfaPassword().trim() || null, code).subscribe({
      next: () => {
        this.tfaBusy.set(false);
        this.resetTfaFlow('idle');
        this.tfaSuccess.set('Двухфакторная аутентификация отключена.');
        setTimeout(() => this.tfaSuccess.set(null), 4000);
        this.refreshUser();
        // Disabling 2FA revokes every session and trusted device server-side.
        this.loadSessionsAndDevices();
      },
      error: (err: HttpErrorResponse) => this.failTfa(err),
    });
  }

  confirmTfaRegenerate(): void {
    const code = this.tfaCode().trim();
    if (!code || this.tfaBusy()) return;
    this.tfaBusy.set(true);
    this.tfaError.set(null);
    this.twoFactorSvc.regenerateRecoveryCodes(code).subscribe({
      next: codes => {
        this.tfaBusy.set(false);
        this.tfaRecoveryCodes.set(codes);
        this.tfaCode.set('');
      },
      error: (err: HttpErrorResponse) => this.failTfa(err),
    });
  }

  copyTfaCodes(): void {
    const codes = this.tfaRecoveryCodes();
    if (!codes) return;
    navigator.clipboard.writeText(codes.join('\n')).then(() => {
      this.tfaCodesCopied.set(true);
      setTimeout(() => this.tfaCodesCopied.set(false), 2000);
    });
  }

  finishTfaFlow(): void {
    this.resetTfaFlow('idle');
  }

  cancelTfaFlow(): void {
    this.resetTfaFlow('idle');
  }

  private resetTfaFlow(mode: 'idle' | 'enroll' | 'disable' | 'regenerate'): void {
    this.tfaMode.set(mode);
    this.tfaError.set(null);
    this.tfaSuccess.set(null);
    this.tfaSecret.set(null);
    this.tfaOtpAuthUri.set(null);
    this.tfaCode.set('');
    this.tfaPassword.set('');
    this.tfaRecoveryCodes.set(null);
    this.tfaCodesCopied.set(false);
  }

  private failTfa(err: HttpErrorResponse): void {
    this.tfaBusy.set(false);
    if (err.status === 400 || err.status === 401) {
      this.tfaError.set('Неверный код или пароль. Попробуйте снова.');
    } else if (err.status === 429) {
      this.tfaError.set('Слишком много попыток. Подождите немного.');
    } else {
      this.tfaError.set('Не удалось выполнить операцию. Попробуйте позже.');
    }
  }

  private refreshUser(): void {
    this.auth.loadCurrentUser().subscribe({ error: () => { /* stale flag until next reload */ } });
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

  toggleNotifications(): void {
    this.runPreferenceSave(this.prefs.setReceiveNotifications(!this.prefs.receiveNotifications()));
  }

  setTheme(theme: ThemePreference): void {
    this.runPreferenceSave(this.prefs.setTheme(theme));
  }

  private runPreferenceSave(save$: Observable<void>): void {
    this.prefsSaving.set(true);
    this.prefsError.set(null);

    save$.subscribe({
      next: () => this.prefsSaving.set(false),
      error: () => {
        this.prefsSaving.set(false);
        this.prefsError.set('Не удалось сохранить настройки. Попробуйте снова.');
      },
    });
  }

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) return;
    // Preferences may not exist yet — the service keeps prefsLoaded() false and
    // the form stays disabled rather than PUTting a guessed notifications flag.
    this.prefs.load(user.id).subscribe({ error: () => { /* defaults stay */ } });
    this.loadSecurity();
    this.loadSessionsAndDevices();
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
