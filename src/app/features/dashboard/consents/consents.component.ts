import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ConsentService } from '../../../core/consents/consent.service';
import { UserConsentDto } from '../../../shared/models/dto/consent.dto';

@Component({
  selector: 'app-consents',
  standalone: true,
  imports: [],
  templateUrl: './consents.component.html',
  styleUrl: './consents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentsComponent implements OnInit {
  private readonly consentService = inject(ConsentService);
  private readonly titleService = inject(Title);

  readonly consents = signal<UserConsentDto[]>([]);
  readonly loading = signal(true);
  readonly revoking = signal(false);
  readonly error = signal<string | null>(null);
  readonly revokeError = signal<string | null>(null);
  readonly revokeSuccess = signal(false);

  readonly TYPE_LABELS: Record<number, string> = {
    0: 'Обработка персональных данных',
    1: 'Политика конфиденциальности',
    2: 'Пользовательское соглашение',
    3: 'Использование cookies',
  };

  readonly cookiesConsent = computed(() =>
    this.consents().find(c => c.type === 3) ?? null
  );

  ngOnInit(): void {
    this.titleService.setTitle('Согласия — DevStart');
    this.consentService.getUserConsents().subscribe({
      next: list => { this.consents.set(list); this.loading.set(false); },
      error: ()   => { this.error.set('Не удалось загрузить согласия.'); this.loading.set(false); },
    });
  }

  revokeCookies(): void {
    if (!this.cookiesConsent()?.isActive || this.revoking()) return;
    this.revoking.set(true);
    this.revokeError.set(null);
    this.consentService.revokeConsent(3).subscribe({
      next: () => {
        this.consents.update(list =>
          list.map(c => c.type === 3
            ? { ...c, isActive: false, revokedAt: new Date().toISOString() }
            : c
          )
        );
        this.revoking.set(false);
        this.revokeSuccess.set(true);
        setTimeout(() => this.revokeSuccess.set(false), 3000);
      },
      error: () => {
        this.revoking.set(false);
        this.revokeError.set('Не удалось отозвать согласие. Попробуйте снова.');
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
