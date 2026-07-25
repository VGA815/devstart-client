import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StartupCompetitor } from '../../../../shared/models/startup-competitor.model';
import { StartupDetailFacade } from '../startup-detail.facade';

/** Человеческий текст по стабильному коду Problem Details (title), см. docs/api.md. */
const COMPETITOR_ERRORS: Record<string, string> = {
  'StartupCompetitors.DuplicateDomain': 'Конкурент с этим доменом уже добавлен',
  'StartupCompetitors.LimitReached':    'Достигнут лимит карточек конкурентов',
  'StartupCompetitors.InvalidWebsite':  'Укажите корректную ссылку на сайт (https://…)',
};

function competitorErrorMessage(title?: string): string {
  return (title && COMPETITOR_ERRORS[title]) || 'Не удалось сохранить. Попробуйте снова.';
}

/** Абсолютный http(s) URL — зеркалит серверную нормализацию домена (StartupCompetitor.NormalizeDomain). */
function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-competitors-tab',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './competitors-tab.component.html',
  styleUrl: './competitors-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompetitorsTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  readonly showCompetitorForm   = signal(false);
  readonly editingCompetitor    = signal<StartupCompetitor | null>(null);
  readonly competitorName       = signal('');
  readonly competitorWebsite    = signal('');
  readonly competitorDesc       = signal('');
  readonly competitorStrengths  = signal('');
  readonly competitorWeaknesses = signal('');
  readonly competitorSaving     = signal(false);
  readonly competitorError      = signal('');

  openNewCompetitorForm(): void {
    this.editingCompetitor.set(null);
    this.competitorName.set('');
    this.competitorWebsite.set('');
    this.competitorDesc.set('');
    this.competitorStrengths.set('');
    this.competitorWeaknesses.set('');
    this.competitorError.set('');
    this.showCompetitorForm.set(true);
  }

  openEditCompetitorForm(c: StartupCompetitor): void {
    this.editingCompetitor.set(c);
    this.competitorName.set(c.name);
    this.competitorWebsite.set(c.website ?? '');
    this.competitorDesc.set(c.description ?? '');
    this.competitorStrengths.set(c.strengthsVsUs ?? '');
    this.competitorWeaknesses.set(c.weaknessesVsUs ?? '');
    this.competitorError.set('');
    this.showCompetitorForm.set(true);
  }

  cancelCompetitorForm(): void {
    this.showCompetitorForm.set(false);
    this.editingCompetitor.set(null);
  }

  saveCompetitor(): void {
    const name = this.competitorName().trim();
    if (!name) { this.competitorError.set('Название обязательно'); return; }

    const website = this.competitorWebsite().trim();
    if (!website) { this.competitorError.set('Ссылка на сайт обязательна'); return; }
    if (!looksLikeUrl(website)) { this.competitorError.set('Укажите корректную ссылку на сайт (https://…)'); return; }

    this.competitorSaving.set(true);
    this.competitorError.set('');

    const editing = this.editingCompetitor();
    const payload = {
      name,
      website,
      description: this.competitorDesc().trim() || undefined,
      strengths_vs_us: this.competitorStrengths().trim() || undefined,
      weaknesses_vs_us: this.competitorWeaknesses().trim() || undefined,
    };

    this.facade.saveCompetitor(payload, editing?.id ?? null).subscribe({
      next: () => {
        this.competitorSaving.set(false);
        this.showCompetitorForm.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.competitorSaving.set(false);
        this.competitorError.set(competitorErrorMessage(err?.error?.title));
      },
    });
  }

  deleteCompetitor(c: StartupCompetitor): void {
    this.facade.deleteCompetitor(c);
  }

  /**
   * Карточка «проработана», если есть сайт и хотя бы одна из сторон (наши/их преимущества) —
   * ровно тот критерий, по которому бэк засчитывает её в балл конкуренции (компонент «а»).
   */
  isWorkedOut(c: StartupCompetitor): boolean {
    return !!(c.website && (c.strengthsVsUs || c.weaknessesVsUs));
  }
}
