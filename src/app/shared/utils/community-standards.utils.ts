import { CommunityDocumentType, CommunityStandardsLevel } from '../models/community-standards.model';

/**
 * Куда ведёт «Добавить» у владельца стартапа: профильные поля правятся на странице
 * редактирования, всё остальное (команда, питч-дек, дорожная карта, документы) — карточками
 * в дашборде.
 */
export type CommunityCheckTarget = 'edit' | 'dashboard';

export interface CommunityCheckMeta {
  label: string;
  hint: string;
  target: CommunityCheckTarget;
}

/**
 * Подписи к машинным ключам из `CommunityStandardsEvaluator`: семь профильных сигналов
 * и пять документов. Порядок здесь не важен — бэк отдаёт чек-лист уже упорядоченным.
 */
const CHECK_META: Record<string, CommunityCheckMeta> = {
  description:     { label: 'Описание проекта',   hint: 'Расскажите, чем занимается стартап',            target: 'edit'      },
  logo:            { label: 'Логотип',            hint: 'Загрузите логотип или аватарку',                target: 'edit'      },
  links:           { label: 'Ссылки',             hint: 'Сайт или соцсети проекта',                      target: 'edit'      },
  product:         { label: 'Продукт',            hint: 'Проблема, решение и ценностное предложение',    target: 'edit'      },
  team:            { label: 'Команда',            hint: 'Основатель и минимум два участника',            target: 'dashboard' },
  pitch_deck:      { label: 'Питч-дек',           hint: 'Загрузите презентацию проекта',                 target: 'dashboard' },
  roadmap:         { label: 'Дорожная карта',     hint: 'Минимум три пункта плана',                      target: 'dashboard' },
  code_of_conduct: { label: 'Кодекс поведения',   hint: 'Правила общения в сообществе проекта',          target: 'dashboard' },
  contributing:    { label: 'Как участвовать',    hint: 'Как присоединиться к проекту и помочь',         target: 'dashboard' },
  support:         { label: 'Поддержка',          hint: 'Куда обращаться за помощью',                    target: 'dashboard' },
  security_policy: { label: 'Безопасность',       hint: 'Как сообщить об уязвимости',                    target: 'dashboard' },
  legal:           { label: 'Правовая информация', hint: 'Лицензия, реквизиты, условия использования',   target: 'dashboard' },
};

const FALLBACK_META: CommunityCheckMeta = { label: '', hint: '', target: 'dashboard' };

/** Ключ приходит с бэка строкой, поэтому неизвестное значение не должно ломать вкладку. */
export function getCommunityCheckMeta(key: string): CommunityCheckMeta {
  return CHECK_META[key] ?? { ...FALLBACK_META, label: key };
}

const DOC_TYPE_LABEL: Record<CommunityDocumentType, string> = {
  CodeOfConduct:  'Кодекс поведения',
  Contributing:   'Как участвовать',
  Support:        'Поддержка',
  SecurityPolicy: 'Политика безопасности',
  Legal:          'Правовая информация',
};

const DOC_TYPE_HINT: Record<CommunityDocumentType, string> = {
  CodeOfConduct:  'Нормы общения и что делать при их нарушении',
  Contributing:   'Как присоединиться к проекту и чем помочь',
  Support:        'Каналы поддержки и время ответа',
  SecurityPolicy: 'Как сообщить об уязвимости и что будет дальше',
  Legal:          'Лицензия, реквизиты, условия использования',
};

export function getCommunityDocumentLabel(type: CommunityDocumentType): string {
  return DOC_TYPE_LABEL[type] ?? type;
}

export function getCommunityDocumentHint(type: CommunityDocumentType): string {
  return DOC_TYPE_HINT[type] ?? '';
}

/** Все типы в порядке чек-листа — редактор рисует по одной строке на тип. */
export const COMMUNITY_DOC_TYPES: CommunityDocumentType[] = [
  'CodeOfConduct', 'Contributing', 'Support', 'SecurityPolicy', 'Legal',
];

const LEVEL_LABEL: Record<CommunityStandardsLevel, string> = {
  Incomplete: 'Не заполнено',
  Developing: 'В процессе',
  Complete:   'Соответствует',
};

/** Модификатор для `.cs-level`/`.sr-community` — цветовая триада берётся в SCSS. */
const LEVEL_MOD: Record<CommunityStandardsLevel, string> = {
  Incomplete: 'incomplete',
  Developing: 'developing',
  Complete:   'complete',
};

export function getCommunityLevelLabel(level: CommunityStandardsLevel): string {
  return LEVEL_LABEL[level] ?? LEVEL_LABEL.Incomplete;
}

export function getCommunityLevelMod(level: CommunityStandardsLevel): string {
  return LEVEL_MOD[level] ?? LEVEL_MOD.Incomplete;
}
