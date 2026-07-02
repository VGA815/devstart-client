import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ConsentService } from '../../../core/consents/consent.service';
import { ConsentItemDto } from '../../../shared/models/dto/consent.dto';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

interface ConsentRow {
  type:            number;
  documentVersion: string;
  title:           string;
  content:         string;
  accepted:        boolean;
}

@Component({
  selector: 'app-consent-challenge',
  standalone: true,
  imports: [MarkdownPipe],
  templateUrl: './consent-challenge.component.html',
  styleUrl: './consent-challenge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentChallengeComponent implements OnInit {
  private readonly auth           = inject(AuthService);
  private readonly consentService = inject(ConsentService);
  private readonly router         = inject(Router);
  private readonly titleService   = inject(Title);

  readonly TYPE_LABELS: Record<number, string> = {
    0: 'Обработка персональных данных',
    1: 'Политика конфиденциальности',
    2: 'Пользовательское соглашение',
    3: 'Использование cookies',
    4: 'Публичная оферта',
  };

  readonly loading    = signal(true);
  readonly submitting = this.auth.loading;
  readonly error      = signal<string | null>(null);
  readonly rows       = signal<ConsentRow[]>([]);

  readonly allAccepted = computed(() => {
    const rows = this.rows();
    return rows.length > 0 && rows.every(r => r.accepted);
  });

  ngOnInit(): void {
    this.titleService.setTitle('Обновление согласий — DevStart');

    const challenge = this.auth.pendingChallenge();
    if (!challenge) {
      // No challenge in memory (e.g. page reload) — nothing to satisfy here.
      this.router.navigate(['/login']);
      return;
    }

    const required = challenge.required;
    if (!required.length) {
      this.loading.set(false);
      return;
    }

    // Show each required document at the exact version the backend asked for.
    forkJoin(
      required.map(req => this.consentService.getDocumentVersion(req.type, req.documentVersion)),
    ).subscribe({
      next: docs => {
        this.rows.set(
          required.map((req, i) => ({
            type:            req.type,
            documentVersion: req.documentVersion,
            title:           docs[i].title || this.TYPE_LABELS[req.type] || `Документ #${req.type}`,
            content:         docs[i].content ?? '',
            accepted:        false,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не удалось загрузить документы. Обновите страницу.');
        this.loading.set(false);
      },
    });
  }

  toggle(type: number, accepted: boolean): void {
    this.rows.update(rows => rows.map(r => (r.type === type ? { ...r, accepted } : r)));
  }

  submit(): void {
    if (!this.allAccepted() || this.submitting()) return;
    this.error.set(null);

    const consents: ConsentItemDto[] = this.rows().map(r => ({
      type:             r.type,
      document_version: r.documentVersion,
      accepted:         r.accepted,
    }));

    this.auth.completeConsent(consents).subscribe({
      next: outcome => {
        if (outcome.kind === 'authenticated') {
          this.router.navigate(['/dashboard']);
        } else {
          // Backend re-issued a challenge — unexpected; keep the user on this screen.
          this.error.set('Требуется подтвердить дополнительные документы.');
        }
      },
      error: () => this.error.set('Не удалось сохранить согласия. Попробуйте снова.'),
    });
  }

  cancel(): void {
    this.auth.clearPendingChallenge();
    this.router.navigate(['/login']);
  }
}
