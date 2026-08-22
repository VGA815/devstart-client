import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  PARTNERSHIP_KIND_LABELS,
  PARTNERSHIP_SATURATION_COUNT,
  PartnershipKind,
  StartupPartnership,
} from '../../../../shared/models/startup-partnership.model';
import { StartupDetailFacade } from '../startup-detail.facade';

/** Человеческий текст по стабильному коду Problem Details (title), см. docs/api.md. */
const PARTNERSHIP_ERRORS: Record<string, string> = {
  'StartupPartnerships.DuplicateDomain': 'Партнёр с этим доменом уже добавлен',
  'StartupPartnerships.LimitReached':    'Достигнут лимит записей о партнёрствах',
  'StartupPartnerships.InvalidWebsite':  'Укажите корректную ссылку на сайт (https://…)',
  'StartupPartnerships.Unauthorized':    'Недостаточно прав для изменения записей',
};

function partnershipErrorMessage(title?: string): string {
  return (title && PARTNERSHIP_ERRORS[title]) || 'Не удалось сохранить. Попробуйте снова.';
}

/** Абсолютный http(s) URL — зеркалит серверную нормализацию домена (`WebsiteDomain.Normalize`). */
function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Порядок в выпадающем списке — от самого частого к самому редкому, а не по номеру enum'а. */
const KIND_ORDER: PartnershipKind[] = [
  PartnershipKind.Pilot,
  PartnershipKind.Customer,
  PartnershipKind.Distribution,
  PartnershipKind.Integration,
  PartnershipKind.Supplier,
  PartnershipKind.Research,
  PartnershipKind.Institutional,
  PartnershipKind.Other,
];

const KINDS: { kind: PartnershipKind; label: string }[] =
  KIND_ORDER.map(kind => ({ kind, label: PARTNERSHIP_KIND_LABELS[kind] }));

@Component({
  selector: 'app-partnerships-tab',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './partnerships-tab.component.html',
  styleUrl: './partnerships-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnershipsTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  readonly kinds = KINDS;
  readonly saturationCount = PARTNERSHIP_SATURATION_COUNT;

  readonly showForm    = signal(false);
  readonly editing     = signal<StartupPartnership | null>(null);
  readonly formName    = signal('');
  readonly formWebsite = signal('');
  readonly formKind    = signal<PartnershipKind>(PartnershipKind.Pilot);
  readonly formDesc    = signal('');
  readonly formSaving  = signal(false);
  readonly formError   = signal('');

  /** Сколько записей засчитано — счёт ведёт бэк (`isWorkedOut`), здесь только суммируем. */
  readonly workedOutCount = computed(
    () => this.facade.partnerships().filter(p => p.isWorkedOut).length
  );

  /** Сколько проработанных записей ещё добавит к оценке; после насыщения — ноль. */
  readonly remainingToSaturation = computed(
    () => Math.max(0, PARTNERSHIP_SATURATION_COUNT - this.workedOutCount())
  );

  kindLabel(kind: PartnershipKind): string {
    return PARTNERSHIP_KIND_LABELS[kind] ?? String(kind);
  }

  openNewForm(): void {
    this.editing.set(null);
    this.formName.set('');
    this.formWebsite.set('');
    this.formKind.set(PartnershipKind.Pilot);
    this.formDesc.set('');
    this.formError.set('');
    this.showForm.set(true);
  }

  openEditForm(p: StartupPartnership): void {
    this.editing.set(p);
    this.formName.set(p.partnerName);
    this.formWebsite.set(p.website);
    this.formKind.set(p.kind);
    this.formDesc.set(p.description ?? '');
    this.formError.set('');
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  setKind(value: string): void {
    this.formKind.set(Number(value) as PartnershipKind);
  }

  save(): void {
    const partnerName = this.formName().trim();
    if (!partnerName) { this.formError.set('Название партнёра обязательно'); return; }

    const website = this.formWebsite().trim();
    if (!website) { this.formError.set('Ссылка на сайт партнёра обязательна'); return; }
    if (!looksLikeUrl(website)) { this.formError.set('Укажите корректную ссылку на сайт (https://…)'); return; }

    this.formSaving.set(true);
    this.formError.set('');

    const editing = this.editing();
    const payload = {
      partner_name: partnerName,
      website,
      kind: this.formKind(),
      description: this.formDesc().trim() || undefined,
    };

    this.facade.savePartnership(payload, editing?.id ?? null).subscribe({
      next: () => {
        this.formSaving.set(false);
        this.showForm.set(false);
        this.editing.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.formSaving.set(false);
        this.formError.set(partnershipErrorMessage(err?.error?.title));
      },
    });
  }

  remove(p: StartupPartnership): void {
    this.facade.deletePartnership(p);
  }
}
