import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ScoreFactor } from '../../../../shared/models/startup-score.model';
import { ServiceOrder } from '../../../../shared/models/service-order.model';
import { formatMoney, formatRelativeTime } from '../../../../shared/utils/format.utils';
import { ServicePurchaseFacade } from '../../../billing/service-purchase/service-purchase.facade';
import { toStartupTarget } from '../../../billing/service-purchase/service-purchase.store';
import {
  formatHintTargets, formatPoints, formatScoreValue,
  getComponentLabel, getHintLabel, getInputLabel,
} from '../../../../shared/utils/scoring-labels.utils';
import { StartupDetailFacade } from '../startup-detail.facade';
import { StartupScoreService } from '../../startup-score.service';

/** Справочник по имени фактора (строки приходят с бэка на англ.): иконка, подпись, описание оси. */
interface FactorMeta { label: string; icon: string; desc: string; }

const FACTOR_REF: Record<string, FactorMeta> = {
  Team:        { label: 'Команда',     icon: '👥',  desc: 'Опыт, экспертиза, предыдущие стартапы' },
  Market:      { label: 'Рынок',       icon: '📈',  desc: 'TAM, темп роста, конкуренция' },
  Product:     { label: 'Продукт',     icon: '⚙️',  desc: 'MVP, патенты, уникальность' },
  Traction:    { label: 'Traction',    icon: '🚀',  desc: 'Метрики, клиенты, рост' },
  Competition: { label: 'Конкуренция', icon: '🏆',  desc: 'Позиция относительно конкурентов' },
};

// Флаги источника → чип. Фактор может нести несколько флагов сразу, поэтому чипов может быть >1.
const SOURCE_FLAGS: { flag: number; label: string; kind: string }[] = [
  { flag: 1, label: 'со слов стартапа', kind: 'self' },
  { flag: 2, label: 'данные платформы', kind: 'platform' },
  { flag: 4, label: 'внешний бенчмарк', kind: 'external' },
  // Название чипа не обещает больше, чем платформа знает: реестр сверен, владение — нет.
  { flag: 8, label: 'сверено с реестром', kind: 'registry' },
];

interface SourceChip { label: string; kind: string; }

// Имена методов приходят с бэка как идентификаторы (ValuationCalculator): подписи — здесь.
// Состав списка задаёт бэк — фронт ничего не додумывает, только читаемо называет пришедшее.
const METHOD_LABELS: Record<string, string> = {
  Berkus:     'Berkus',
  Scorecard:  'Scorecard',
  VcMethod:   'VC-метод',
  Comparable: 'Сравнительный',
};

@Component({
  selector: 'app-scoring-tab',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './scoring-tab.component.html',
  styleUrl: './scoring-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoringTabComponent {
  protected readonly facade = inject(StartupDetailFacade);
  private readonly purchase = inject(ServicePurchaseFacade);
  private readonly scoreSvc = inject(StartupScoreService);

  /**
   * Скоринг закрыт подпиской, но тот же разбор продаётся разово именно по этому проекту (SC-49).
   * Каталог и свои заказы подтягиваем только при заходе на вкладку — на остальных экранах
   * карточки стартапа эти запросы не нужны.
   */
  constructor() {
    this.purchase.ensureLoaded();
  }

  /** Цена разового отчёта; пусто — каталог ещё не загружен либо услуга отключена. */
  protected readonly reportPrice = computed<string>(() => {
    const item = this.purchase.catalog().find(i => i.serviceType === 'ScoringReport');
    if (!item) return '';
    const amount = new Intl.NumberFormat('ru-RU').format(item.price);
    return `${amount} ${item.currency === 'RUB' ? '₽' : item.currency}`;
  });

  /** Отчёт по этому проекту уже оплачен — предлагать покупку второй раз нельзя. */
  protected readonly reportAccess = computed<ServiceOrder | null>(() => {
    const startup = this.facade.startup();
    return startup ? this.purchase.accessFor('ScoringReport', startup.id) : null;
  });

  /** Цель предвыбрана — диалог открывается сразу на сводке заказа. */
  protected buyReport(): void {
    const startup = this.facade.startup();
    if (!startup) return;

    this.purchase.open({ serviceType: 'ScoringReport', target: toStartupTarget(startup) });
  }

  protected readonly reportLoading = signal(false);
  protected readonly reportError = signal('');

  /**
   * Забирает у сервера подписанную ссылку на PDF-отчёт и открывает её. Файл собирает сервер: те же
   * баллы, та же версия методики и та же формулировка про ориентир диапазона, что и на экране.
   */
  protected downloadReport(): void {
    const startup = this.facade.startup();
    if (!startup || this.reportLoading()) return;

    this.reportLoading.set(true);
    this.reportError.set('');

    this.scoreSvc.getReportDownloadUrl(startup.id)
      .pipe(catchError(() => of(null)))
      .subscribe(result => {
        this.reportLoading.set(false);
        if (!result) {
          this.reportError.set('Не удалось сформировать отчёт. Попробуйте ещё раз.');
          return;
        }
        window.location.href = result.url;
      });
  }

  protected readonly formatMoney         = formatMoney;
  protected readonly formatRelativeTime  = formatRelativeTime;
  protected readonly formatScoreValue    = formatScoreValue;
  protected readonly formatPoints        = formatPoints;
  protected readonly formatHintTargets   = formatHintTargets;
  protected readonly getComponentLabel   = getComponentLabel;
  protected readonly getInputLabel       = getInputLabel;
  protected readonly getHintLabel        = getHintLabel;

  /**
   * Раскрытые факторы. Держим локально, а не в сторе: на раскрытие ничего не грузится, всё уже
   * в ответе. Открытых может быть несколько сразу — сравнить два фактора рядом и есть смысл разбора.
   */
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  factorMeta(name: string): FactorMeta {
    return FACTOR_REF[name] ?? { label: name, icon: '•', desc: '' };
  }

  isExpanded(factor: string): boolean {
    return this.expanded().has(factor);
  }

  toggle(factor: string): void {
    const next = new Set(this.expanded());
    next.has(factor) ? next.delete(factor) : next.add(factor);
    this.expanded.set(next);
  }

  /**
   * Детализация может быть пустой: ответ мог быть посчитан до её появления и лежать в часовом
   * кэше бэка. Тогда кнопки просто нет — вкладка деградирует до прежнего вида.
   */
  hasDetail(f: ScoreFactor): boolean {
    const d = f.detail;
    return d.components.length + d.inputs.length + d.hints.length > 0;
  }

  /** Строка «Итого» под слагаемыми: наглядно показывает, что сумма сходится с баллом фактора. */
  componentsTotal(f: ScoreFactor): number {
    return f.detail.components.reduce((sum, c) => sum + c.points, 0);
  }

  /** Разбирает флаговое поле source в набор чипов; пустое (0) → «нет данных». */
  sourceChips(source: number): SourceChip[] {
    if (!source) return [{ label: 'нет данных', kind: 'none' }];
    return SOURCE_FLAGS
      .filter(s => (source & s.flag) !== 0)
      .map(({ label, kind }) => ({ label, kind }));
  }

  weightPercent(weight: number): string {
    return `${Math.round(weight * 100)}%`;
  }

  /** Неизвестный метод показываем как есть — врать читаемой подписью хуже, чем показать код. */
  methodLabel(method: string): string {
    return METHOD_LABELS[method] ?? method;
  }
}
