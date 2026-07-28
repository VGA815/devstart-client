import { ScoreValue } from '../models/startup-score.model';
import { formatRub } from './format.utils';

/**
 * Русские подписи к кодам детализации скоринга. Бэк отдаёт только стабильные коды и числа —
 * формулировки и единицы живут здесь (см. docs/scoring-methodology.md).
 *
 * Коды append-only внутри версии методики: смена смысла — это новый код, переименований не бывает.
 * Поэтому неизвестный код показываем как есть: соврать читаемой подписью хуже, чем показать код
 * (та же политика, что у `methodLabel` в scoring-tab).
 */

/** Слагаемые балла. Порядок задаёт бэк: база/тира, затем бонусы, затем ограничение шкалы. */
const COMPONENT_LABELS: Record<string, string> = {
  'team.base.no_members':            'Участники не добавлены',
  'team.base.no_experience':         'Опыт основателей: без опыта',
  'team.base.industry_experience':   'Опыт основателей: отраслевой (от 3 лет)',
  'team.base.serial':                'Опыт основателей: серийный предприниматель',
  'team.base.serial_with_exit':      'Опыт основателей: серийный, с успешным выходом',
  'team.bonus.csuite':               'Полный C-suite: CEO, CTO и CMO',
  'team.clamp':                      'Ограничение шкалы (максимум 100)',

  'market.base.no_tam':              'TAM не указан',
  'market.base.tam_sub_1b':          'Объём рынка: до ₽1 млрд',
  'market.base.tam_1_10b':           'Объём рынка: от ₽1 до ₽10 млрд',
  'market.base.tam_10b_plus':        'Объём рынка: от ₽10 млрд',
  'market.bonus.cagr_10_20':         'Рост рынка 10–20% в год',
  'market.bonus.cagr_20_plus':       'Рост рынка от 20% в год',
  'market.bonus.funnel':             'Непротиворечивая воронка TAM → SAM → SOM',
  'market.clamp':                    'Ограничение шкалы (максимум 100)',

  'product.base.stage_idea':         'Стадия: идея',
  'product.base.stage_pre_seed':     'Стадия: pre-seed',
  'product.base.stage_mvp':          'Стадия: MVP',
  'product.base.stage_seed':         'Стадия: seed',
  'product.base.stage_series_a':     'Стадия: series A',
  'product.bonus.patents':           'Патенты',
  'product.bonus.positioning':       'Сформулированы ценность и отличия',
  'product.bonus.roadmap':           'План развития (от 3 пунктов)',
  'product.clamp':                   'Ограничение шкалы (максимум 100)',

  'traction.tier.no_data':           'Метрики не заполнены',
  'traction.tier.users_only':        'Есть пользователи, выручки нет',
  'traction.tier.declining':         'Выручка есть, но снижается',
  'traction.tier.flat':              'Выручка есть, рост до 10% в месяц',
  'traction.tier.early_growth':      'Рост от 10% в месяц',
  'traction.tier.growing':           'MRR от ₽1 млн при росте от 10% в месяц',
  'traction.tier.scaling':           'MRR от ₽4 млн при росте от 20% в месяц',

  'competition.base.benchmark':      'Плотность сектора по внешнему бенчмарку',
  'competition.base.neutral':        'Бенчмарка сектора нет — нейтральная база',
  'competition.bonus.documented':    'Разобранные карточки конкурентов',
  'competition.clamp':               'Ограничение шкалы (максимум 100)',
};

/** Сырые значения, которые прочитала формула. */
const INPUT_LABELS: Record<string, string> = {
  'team.input.member_count':            'Участников в команде',
  'team.input.founder_tier':            'Уровень опыта',
  'team.input.experience_pool':         'Опыт считался по',
  'team.input.has_ceo':                 'Есть CEO',
  'team.input.has_cto':                 'Есть CTO',
  'team.input.has_cmo':                 'Есть CMO',

  'market.input.tam':                   'TAM',
  'market.input.sam':                   'SAM',
  'market.input.som':                   'SOM',
  'market.input.cagr':                  'Рост рынка в год',

  'product.input.stage':                'Стадия',
  'product.input.has_patents':          'Патенты',
  'product.input.has_positioning':      'Ценность и отличия заполнены',
  'product.input.roadmap_items':        'Пунктов в плане развития',

  'traction.input.mrr':                 'MRR',
  'traction.input.mrr_is_proxy':        'MRR подставлен из метрики «Выручка»',
  'traction.input.mau':                 'MAU',
  'traction.input.mom_growth':          'Рост в месяц',

  'competition.input.total_cards':       'Карточек конкурентов',
  'competition.input.documented_cards':  'Из них разобрано',
  'competition.input.sector_intensity':  'Плотность сектора',
};

/** Невыполненные условия. Формулируем как действие, а не как упрёк. */
const HINT_LABELS: Record<string, string> = {
  'team.hint.add_members':                 'Добавить участников команды',
  'team.hint.csuite':                      'Закрыть роли C-suite',

  'market.hint.fill_tam':                  'Указать объём рынка (TAM)',
  'market.hint.funnel':                    'Указать SAM и SOM так, чтобы SOM ≤ SAM ≤ TAM',

  'product.hint.positioning':              'Сформулировать ценностное предложение и отличия',
  'product.hint.roadmap':                  'Добавить пункты в план развития',

  'traction.hint.first_users':             'Начать вести метрики: первые пользователи',
  'traction.hint.first_revenue':           'Начать получать выручку',
  'traction.hint.stop_decline':            'Остановить снижение выручки',
  'traction.hint.growth_10':               'Выйти на рост от 10% в месяц',
  'traction.hint.mrr_1m':                  'Довести MRR до ₽1 млн, сохранив рост',
  'traction.hint.mrr_4m':                  'Довести MRR до ₽4 млн, сохранив рост',

  'competition.hint.document_card':         'Разобрать ещё одного конкурента: сайт плюс сильные или слабые стороны',
  'competition.hint.first_documented_card': 'Разобрать первого конкурента: сайт плюс сильные или слабые стороны',
};

/** Коды значений — отдельный словарь: они называют значение, а не правило. */
const VALUE_CODE_LABELS: Record<string, string> = {
  'stage.idea':                        'идея',
  'stage.pre_seed':                    'pre-seed',
  'stage.mvp':                         'MVP',
  'stage.seed':                        'seed',
  'stage.series_a':                    'series A',

  'founder_tier.no_experience':        'без опыта',
  'founder_tier.industry_experience':  'отраслевой опыт',
  'founder_tier.serial':               'серийный предприниматель',
  'founder_tier.serial_with_exit':     'серийный, с успешным выходом',

  'pool.founders':                     'основателям',
  'pool.all_members':                  'всем участникам (основатели не отмечены)',

  'position.ceo':                      'CEO',
  'position.cto':                      'CTO',
  'position.cmo':                      'CMO',
};

export function getComponentLabel(code: string): string {
  return COMPONENT_LABELS[code] ?? code;
}

export function getInputLabel(code: string): string {
  return INPUT_LABELS[code] ?? code;
}

export function getHintLabel(code: string): string {
  return HINT_LABELS[code] ?? code;
}

export function getValueCodeLabel(code: string): string {
  return VALUE_CODE_LABELS[code] ?? code;
}

const NUMBER_FORMAT = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

/** Единицы задаёт `kind`: бэк присылает голое число, форматирование — здесь. */
export function formatScoreValue(value: ScoreValue): string {
  switch (value.kind) {
    case 1: return formatRub(value.number);
    case 2: return `${NUMBER_FORMAT.format(value.number ?? 0)}%`;
    case 3: return NUMBER_FORMAT.format(value.number ?? 0);
    case 4: return value.number ? 'да' : 'нет';
    case 5: return getValueCodeLabel(value.code ?? '');
    case 6: return `${NUMBER_FORMAT.format(value.number ?? 0)} из 100`;
    default: return 'не заполнено';
  }
}

/** Слагаемое со знаком: «+10», «−5». Ноль — законная ступень шкалы, показываем как «+0». */
export function formatPoints(points: number): string {
  return points < 0
    ? `−${NUMBER_FORMAT.format(Math.abs(points))}`
    : `+${NUMBER_FORMAT.format(points)}`;
}

/** Ориентиры подсказки: составное условие («₽1 млн · 10%») читается через разделитель. */
export function formatHintTargets(targets: ScoreValue[]): string {
  return targets.map(formatScoreValue).join(' · ');
}
