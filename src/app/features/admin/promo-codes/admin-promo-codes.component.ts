import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import { AdminPromoCode, DISCOUNT_TYPE_LABELS, PLAN_LABELS } from '../admin.models';

@Component({
  selector: 'app-admin-promo-codes',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './admin-promo-codes.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPromoCodesComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly loading = signal(true);
  readonly error   = signal('');
  readonly codes   = signal<AdminPromoCode[]>([]);

  readonly activeOnly = signal(false);

  // create form
  readonly formOpen      = signal(false);
  readonly code          = signal('');
  readonly discountType  = signal('0');    // 0 %, 1 fixed, 2 free period
  readonly discountValue = signal('');
  readonly freeDays      = signal('');
  readonly maxRedemptions = signal('');
  readonly validFrom     = signal('');
  readonly validUntil    = signal('');
  readonly busy          = signal(false);
  readonly formError     = signal('');
  readonly actionError   = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.admin.getPromoCodes(this.activeOnly() ? true : undefined).pipe(
      catchError(() => {
        this.error.set('Не удалось загрузить промокоды.');
        return of([] as AdminPromoCode[]);
      })
    ).subscribe(list => {
      this.codes.set(list);
      this.loading.set(false);
    });
  }

  toggleActiveOnly(): void {
    this.activeOnly.set(!this.activeOnly());
    this.load();
  }

  submitCreate(): void {
    const code = this.code().trim();
    const type = +this.discountType();
    if (!code || this.busy()) return;

    const value = Number(this.discountValue().trim().replace(',', '.'));
    const freeDays = this.freeDays().trim() ? parseInt(this.freeDays(), 10) : null;

    if (type !== 2 && (isNaN(value) || value <= 0)) {
      this.formError.set('Укажите положительное значение скидки.');
      return;
    }
    if (type === 2 && (!freeDays || freeDays <= 0)) {
      this.formError.set('Для бесплатного периода укажите количество дней.');
      return;
    }

    const maxRedemptions = this.maxRedemptions().trim() ? parseInt(this.maxRedemptions(), 10) : null;

    this.busy.set(true);
    this.formError.set('');

    this.admin.createPromoCode({
      code,
      discountType: type,
      discountValue: type === 2 ? 0 : value,
      freePeriodDays: type === 2 ? freeDays : null,
      plan: 1, // Pro — единственный платный план
      maxRedemptions,
      validFrom: this.validFrom() ? new Date(this.validFrom()).toISOString() : null,
      validUntil: this.validUntil() ? new Date(this.validUntil()).toISOString() : null,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.formOpen.set(false);
        this.resetForm();
        this.load();
      },
      error: (err) => {
        this.busy.set(false);
        this.formError.set(err?.error?.title === 'PromoCodes.CodeAlreadyExists'
          ? 'Промокод с таким кодом уже существует.'
          : 'Не удалось создать промокод.');
      },
    });
  }

  deactivate(c: AdminPromoCode): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.actionError.set('');

    this.admin.deactivatePromoCode(c.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.actionError.set('Не удалось деактивировать промокод.');
      },
    });
  }

  private resetForm(): void {
    this.code.set('');
    this.discountType.set('0');
    this.discountValue.set('');
    this.freeDays.set('');
    this.maxRedemptions.set('');
    this.validFrom.set('');
    this.validUntil.set('');
  }

  discountLabel(c: AdminPromoCode): string {
    switch (c.discountType) {
      case 0: return `-${c.discountValue}%`;
      case 1: return `-${c.discountValue} ₽`;
      case 2: return `${c.freePeriodDays ?? '?'} дн. бесплатно`;
      default: return DISCOUNT_TYPE_LABELS[c.discountType] ?? '';
    }
  }

  planLabel(v: number): string { return PLAN_LABELS[v] ?? String(v); }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value));
  }
}
