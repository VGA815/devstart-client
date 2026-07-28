import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ScoreFactor } from '../../../../shared/models/startup-score.model';
import { formatMoney, formatRelativeTime } from '../../../../shared/utils/format.utils';
import {
  formatHintTargets, formatPoints, formatScoreValue,
  getComponentLabel, getHintLabel, getInputLabel,
} from '../../../../shared/utils/scoring-labels.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

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
