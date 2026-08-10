import { Component, ChangeDetectionStrategy, inject, signal, computed, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StartupDetailFacade } from '../startup-detail.facade';
import { DealTermsWarning, SuggestedTerms } from '../../../../shared/models/startup-score.model';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { formatRub } from '../../../../shared/utils/format.utils';
import { pctToFraction } from '../../../../shared/utils/percent.utils';

export const SAFE = 0;
export const CONVERTIBLE = 1;
export const PRICED = 2;

export const INSTRUMENTS = [
  { value: SAFE,        label: 'SAFE' },
  { value: CONVERTIBLE, label: 'Конвертируемый заём' },
  { value: PRICED,      label: 'Priced Round' },
] as const;

/** Поля условий сделки — ключи для пометок «авто-заполнено» и для отката. */
type TermField =
  | 'valuationCap' | 'discountPct' | 'interestRatePct'
  | 'termMonths' | 'preMoney' | 'liquidationPref';

type FieldKey = TermField | 'amount' | 'message';

const ALL_TERM_FIELDS: readonly TermField[] = [
  'valuationCap', 'discountPct', 'interestRatePct', 'termMonths', 'preMoney', 'liquidationPref',
];

/**
 * Какие поля вообще относятся к инструменту. Отправляем и валидируем только их: иначе после
 * авто-заполнения под SAFE и переключения на Priced Round в заявку уезжал бы призрачный cap.
 */
const FIELDS_BY_INSTRUMENT: Record<number, readonly TermField[]> = {
  [SAFE]:        ['valuationCap', 'discountPct'],
  [CONVERTIBLE]: ['valuationCap', 'discountPct', 'interestRatePct', 'termMonths'],
  [PRICED]:      ['preMoney', 'liquidationPref'],
};

/** Инструменты, где pro-rata rights имеет смысл (у конвертируемого займа его нет). */
const PRO_RATA_INSTRUMENTS: readonly number[] = [SAFE, PRICED];

/**
 * Русские подписи к предупреждениям DealTermsValidator. Незнакомый код — не повод молчать:
 * фолбэк на формулировку бэкенда, чтобы новое правило появилось в UI до правки клиента.
 */
const WARNING_LABELS: Record<string, string> = {
  'deal_terms.aggressive_discount':
    'Дисконт выше 25% — агрессивно по рыночным стандартам.',
  'deal_terms.high_liq_pref':
    'Liquidation preference выше 1× срезает апсайд основателей при выходе.',
  'deal_terms.high_interest_rate':
    'Ставка выше 8% годовых выше типичного рынка для конвертируемых займов.',
  'deal_terms.amount_exceeds_cap':
    'Сумма достигает или превышает valuation cap — инвестор забирает весь cap table.',
  'deal_terms.high_dilution':
    'Доля инвестора выше 30% — необычно много для раннего раунда.',
};

@Component({
  selector: 'app-invest-form',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './invest-form.component.html',
  styleUrl: './invest-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestFormComponent {
  protected readonly facade = inject(StartupDetailFacade);

  readonly close = output<void>();

  protected readonly instruments = INSTRUMENTS;
  protected readonly proRataApplies = computed(() => PRO_RATA_INSTRUMENTS.includes(this.investInstrument()));

  readonly investAmount    = signal('');
  readonly investRoadmapId = signal('');
  readonly investMessage   = signal('');
  readonly investInstrument = signal<number>(SAFE);

  // Суммы в ₽, ставки в процентах — как показано пользователю. Перевод в доли для API
  // происходит один раз, при сборке payload.
  readonly investValuationCap    = signal('');
  readonly investDiscount        = signal('');
  readonly investInterestRate    = signal('');
  readonly investTermMonths      = signal('');
  readonly investPreMoney        = signal('');
  readonly investLiquidationPref = signal('');
  readonly investProRata         = signal(false);

  readonly suggestedTermsLoading = signal(false);
  readonly suggestError          = signal('');
  readonly investSubmitting      = signal(false);
  readonly investError           = signal('');
  readonly investSuccess         = signal(false);

  /** Предпросмотр сделки от бэкенда: доля инвестора, предупреждения, обоснование cap. */
  readonly preview = signal<SuggestedTerms | null>(null);

  /** Инструмент, сумма и значения полей на момент расчёта — чтобы поймать устаревание. */
  private readonly previewContext = signal<{ instrument: number; amount: number } | null>(null);
  private readonly appliedValues = signal<Partial<Record<TermField, string>>>({});

  /** Поля, заполненные последним расчётом и с тех пор не тронутые вручную. */
  readonly autoFilled = signal<ReadonlySet<TermField>>(new Set());

  /** Значения полей до применения авто-условий — для «вернуть мои значения». */
  private readonly undoSnapshot = signal<Record<TermField, string> | null>(null);

  private readonly touched = signal<ReadonlySet<FieldKey>>(new Set());
  protected readonly submitAttempted = signal(false);

  // ─── Чтение / запись полей ──────────────────────────────────────────────────

  private readonly fieldSignals: Record<TermField, ReturnType<typeof signal<string>>> = {
    valuationCap:    this.investValuationCap,
    discountPct:     this.investDiscount,
    interestRatePct: this.investInterestRate,
    termMonths:      this.investTermMonths,
    preMoney:        this.investPreMoney,
    liquidationPref: this.investLiquidationPref,
  };

  /** Ручная правка: снимаем пометку «авто» — значение больше не от движка оценки. */
  setTermField(field: TermField, value: string): void {
    this.fieldSignals[field].set(value);
    if (this.autoFilled().has(field)) {
      const next = new Set(this.autoFilled());
      next.delete(field);
      this.autoFilled.set(next);
    }
    this.markTouched(field);
  }

  isAutoFilled(field: TermField): boolean {
    return this.autoFilled().has(field);
  }

  markTouched(field: FieldKey): void {
    if (this.touched().has(field)) return;
    this.touched.set(new Set(this.touched()).add(field));
  }

  setInstrument(value: number): void {
    if (this.investInstrument() === value) return;
    this.investInstrument.set(value);
    // Предпросмотр считался под другой инструмент — держать его как актуальный нельзя.
    this.preview.set(null);
    this.previewContext.set(null);
    this.suggestError.set('');
    this.autoFilled.set(new Set());
    this.undoSnapshot.set(null);
  }

  // ─── Валидация: зеркало правил сервера ──────────────────────────────────────
  //
  // Диапазоны один в один как в CreateInvestmentApplicationCommandValidator, но в процентах
  // там, где бэкенд считает долями: discount 0–0.5 → 0–50%, ставка 0–0.30 → 0–30%.

  readonly errors = computed<Partial<Record<FieldKey, string>>>(() => {
    const e: Partial<Record<FieldKey, string>> = {};
    const instrument = this.investInstrument();
    const num = (s: string): number | null => {
      const t = s.trim();
      if (!t) return null;
      const n = Number(t.replace(',', '.'));
      return Number.isFinite(n) ? n : NaN;
    };

    const amount = num(this.investAmount());
    if (amount === null) e.amount = 'Укажите сумму инвестиций.';
    else if (Number.isNaN(amount)) e.amount = 'Сумма должна быть числом.';
    else if (amount <= 0) e.amount = 'Сумма должна быть больше нуля.';

    if (this.investMessage().length > 2000) {
      e.message = `Сообщение длиннее 2000 символов (сейчас ${this.investMessage().length}).`;
    }

    const fields = FIELDS_BY_INSTRUMENT[instrument] ?? [];

    if (fields.includes('valuationCap')) {
      const cap = num(this.investValuationCap());
      if (cap === null) e.valuationCap = 'Обязательно для этого инструмента.';
      else if (Number.isNaN(cap)) e.valuationCap = 'Должно быть числом.';
      else if (cap <= 0) e.valuationCap = 'Должно быть больше нуля.';
    }

    if (fields.includes('discountPct')) {
      const d = num(this.investDiscount());
      // Дисконт опционален, но заданный — только 0–50%.
      if (d !== null && (Number.isNaN(d) || d < 0 || d > 50)) {
        e.discountPct = 'Допустимо от 0 до 50%.';
      }
    }

    if (fields.includes('interestRatePct')) {
      const r = num(this.investInterestRate());
      if (r === null) e.interestRatePct = 'Обязательно для конвертируемого займа.';
      else if (Number.isNaN(r) || r < 0 || r > 30) e.interestRatePct = 'Допустимо от 0 до 30%.';
    }

    if (fields.includes('termMonths')) {
      const t = num(this.investTermMonths());
      if (t === null) e.termMonths = 'Обязательно для конвертируемого займа.';
      else if (Number.isNaN(t) || t < 6 || t > 60) e.termMonths = 'Допустимо от 6 до 60 месяцев.';
      else if (!Number.isInteger(t)) e.termMonths = 'Целое число месяцев.';
    }

    if (fields.includes('preMoney')) {
      const p = num(this.investPreMoney());
      if (p === null) e.preMoney = 'Обязательно для priced round.';
      else if (Number.isNaN(p)) e.preMoney = 'Должно быть числом.';
      else if (p <= 0) e.preMoney = 'Должно быть больше нуля.';
    }

    if (fields.includes('liquidationPref')) {
      const l = num(this.investLiquidationPref());
      // Пустое поле — это серверный дефолт 1×, а не ошибка.
      if (l !== null && (Number.isNaN(l) || l < 1 || l > 3)) {
        e.liquidationPref = 'Допустимо от 1× до 3×.';
      }
    }

    return e;
  });

  readonly isValid = computed(() => Object.keys(this.errors()).length === 0);

  /** Показываем ошибку поля, только когда пользователь его тронул или нажал «Отправить». */
  errorFor(field: FieldKey): string {
    if (!this.submitAttempted() && !this.touched().has(field)) return '';
    return this.errors()[field] ?? '';
  }

  readonly errorCount = computed(() => Object.keys(this.errors()).length);

  // ─── Авто-условия ───────────────────────────────────────────────────────────

  /** Сумма нужна, чтобы посчитать долю инвестора и предупреждения. */
  readonly canSuggest = computed(() => {
    const amount = Number(this.investAmount().trim().replace(',', '.'));
    return Number.isFinite(amount) && amount > 0;
  });

  loadSuggestedTerms(): void {
    if (!this.canSuggest() || !this.facade.investorProfile()) return;

    const amount = Number(this.investAmount().trim().replace(',', '.'));
    const instrument = this.investInstrument();

    this.suggestedTermsLoading.set(true);
    this.suggestError.set('');

    this.facade.loadSuggestedTerms(instrument, amount).subscribe({
      next: terms => {
        this.applySuggestion(terms, instrument, amount);
        this.suggestedTermsLoading.set(false);
      },
      error: (err: unknown) => {
        this.suggestError.set(this.suggestErrorMessage(err));
        this.preview.set(null);
        this.previewContext.set(null);
        this.suggestedTermsLoading.set(false);
      },
    });
  }

  private applySuggestion(terms: SuggestedTerms, instrument: number, amount: number): void {
    // Снимок до перезаписи — авто-условия не должны безвозвратно затирать введённое руками.
    this.undoSnapshot.set(
      ALL_TERM_FIELDS.reduce((acc, f) => {
        acc[f] = this.fieldSignals[f]();
        return acc;
      }, {} as Record<TermField, string>)
    );

    const asText = (v: number | null): string => (v === null ? '' : String(v));
    const suggested: Record<TermField, string> = {
      valuationCap:    asText(terms.valuationCap),
      discountPct:     asText(terms.discountPct),
      interestRatePct: asText(terms.interestRatePct),
      termMonths:      asText(terms.termMonths),
      preMoney:        asText(terms.preMoneyValuation),
      liquidationPref: asText(terms.liquidationPreference),
    };

    // Трогаем только поля текущего инструмента: остальные к этой заявке не относятся.
    const fields = FIELDS_BY_INSTRUMENT[instrument] ?? [];
    const filled = new Set<TermField>();
    const applied: Partial<Record<TermField, string>> = {};

    for (const f of fields) {
      if (!suggested[f]) continue;
      this.fieldSignals[f].set(suggested[f]);
      applied[f] = suggested[f];
      filled.add(f);
    }

    // Pro-rata бэкенд не предлагает — выбор инвестора сохраняем как есть.
    this.autoFilled.set(filled);
    this.appliedValues.set(applied);
    this.preview.set(terms);
    this.previewContext.set({ instrument, amount });
    this.submitAttempted.set(false);
  }

  readonly canUndo = computed(() => this.undoSnapshot() !== null);

  undoSuggestion(): void {
    const snapshot = this.undoSnapshot();
    if (!snapshot) return;

    for (const f of ALL_TERM_FIELDS) {
      this.fieldSignals[f].set(snapshot[f]);
    }
    this.undoSnapshot.set(null);
    this.autoFilled.set(new Set());
    this.appliedValues.set({});
    this.preview.set(null);
    this.previewContext.set(null);
  }

  /**
   * Предпросмотр посчитан бэкендом под конкретную сумму и конкретные условия. Стоит их
   * изменить — доля инвестора и предупреждения уже не про то, что в форме сейчас.
   */
  readonly previewStale = computed(() => {
    const ctx = this.previewContext();
    if (!ctx || !this.preview()) return false;

    const amount = Number(this.investAmount().trim().replace(',', '.'));
    if (!Number.isFinite(amount) || amount !== ctx.amount) return true;
    if (this.investInstrument() !== ctx.instrument) return true;

    const applied = this.appliedValues();
    return Object.entries(applied).some(([f, v]) => this.fieldSignals[f as TermField]() !== v);
  });

  // ─── Предпросмотр: производные для шаблона ──────────────────────────────────

  readonly warnings = computed<DealTermsWarning[]>(() => this.preview()?.warnings ?? []);

  warningLabel(w: DealTermsWarning): string {
    return WARNING_LABELS[w.code] ?? w.message;
  }

  /** Доля основателей после сделки — то, чем founder реально платит за раунд. */
  readonly foundersSharePct = computed(() => {
    const share = this.preview()?.impliedInvestorSharePct;
    return share === null || share === undefined ? null : Math.max(0, 100 - share);
  });

  readonly valuationAnchor = computed(() => {
    const p = this.preview();
    if (!p || p.valuationLowReference === null || p.valuationHighReference === null) return '';
    return `${formatRub(p.valuationLowReference)} — ${formatRub(p.valuationHighReference)}`;
  });

  /** Cap = верхняя граница оценки + 5% (правило бэкенда) — показываем, откуда цифра. */
  readonly capRationale = computed(() => {
    const p = this.preview();
    if (!p || p.valuationCap === null || p.valuationHighReference === null) return '';
    return `верхняя граница оценки ${formatRub(p.valuationHighReference)} + 5%`;
  });

  protected readonly formatRub = formatRub;

  // ─── Отправка ───────────────────────────────────────────────────────────────

  submit(): void {
    const profile = this.facade.investorProfile();
    if (!profile) return;

    // Раскрываем все ошибки вместо молчаливого отказа: заблокированная кнопка без причины —
    // ровно та проблема, из-за которой авто-условия и не работали.
    this.submitAttempted.set(true);
    if (!this.isValid()) {
      this.investError.set('');
      return;
    }

    this.investSubmitting.set(true);
    this.investError.set('');

    this.facade.submitApplication(this.buildPayload()).subscribe({
      next: () => {
        this.investSubmitting.set(false);
        this.investSuccess.set(true);
      },
      error: (err: unknown) => {
        this.investSubmitting.set(false);
        this.investError.set(apiErrorMessage(err, 'Не удалось отправить заявку. Попробуйте снова.'));
      },
    });
  }

  private buildPayload() {
    const num = (s: string): number | undefined => {
      const t = s.trim();
      if (!t) return undefined;
      const n = Number(t.replace(',', '.'));
      return Number.isFinite(n) ? n : undefined;
    };

    const instrument = this.investInstrument();
    const fields = FIELDS_BY_INSTRUMENT[instrument] ?? [];
    const include = (f: TermField) => fields.includes(f);

    // Ставки уходят долями — бэкенд валидирует discount 0–0.5 и ставку 0–0.30.
    const discountPct = include('discountPct') ? num(this.investDiscount()) : undefined;
    const ratePct = include('interestRatePct') ? num(this.investInterestRate()) : undefined;

    return {
      roadmap_item_id: this.investRoadmapId() || undefined,
      amount: num(this.investAmount())!,
      message: this.investMessage().trim() || undefined,
      instrument,
      valuation_cap: include('valuationCap') ? num(this.investValuationCap()) : undefined,
      discount: discountPct === undefined ? undefined : pctToFraction(discountPct),
      interest_rate: ratePct === undefined ? undefined : pctToFraction(ratePct),
      term_months: include('termMonths') ? num(this.investTermMonths()) : undefined,
      pre_money_valuation: include('preMoney') ? num(this.investPreMoney()) : undefined,
      liquidation_preference: include('liquidationPref') ? num(this.investLiquidationPref()) : undefined,
      pro_rata_rights: this.proRataApplies() ? this.investProRata() : undefined,
    };
  }

  /**
   * У отказа в авто-условиях два осмысленных исхода, и оба надо назвать: нет Pro-подписки и
   * нечем оценивать стартап. Раньше оба выглядели как «кнопка не работает».
   */
  private suggestErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const code = (err.error as { title?: string } | null)?.title;

      if (err.status === 403 || code === 'Subscriptions.ProRequired') {
        return 'Авто-условия доступны участникам стартапа и по подписке Pro.';
      }
      if (code === 'Valuation.InsufficientData') {
        return 'Данных о стартапе пока не хватает для оценки — заполните условия вручную.';
      }
    }
    return apiErrorMessage(err, 'Не удалось рассчитать авто-условия. Попробуйте снова.');
  }
}
