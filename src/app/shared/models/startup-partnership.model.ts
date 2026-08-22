/**
 * Вид договорённости. Значения зеркалят `PartnershipKind` на бэке (append-only).
 * Никакой вид не «дороже» другого и в ключ дедупликации не входит: один партнёр — одна запись,
 * сколько бы дел вы вместе ни вели.
 */
export enum PartnershipKind {
  Pilot = 0,
  Customer = 1,
  Distribution = 2,
  Integration = 3,
  Supplier = 4,
  Research = 5,
  Institutional = 6,
  Other = 7,
}

export const PARTNERSHIP_KIND_LABELS: Record<PartnershipKind, string> = {
  [PartnershipKind.Pilot]: 'Пилот',
  [PartnershipKind.Customer]: 'Клиент по договору',
  [PartnershipKind.Distribution]: 'Дистрибуция / реселлер',
  [PartnershipKind.Integration]: 'Технологическая интеграция',
  [PartnershipKind.Supplier]: 'Поставщик / подрядчик',
  [PartnershipKind.Research]: 'НИОКР, вуз, лаборатория',
  [PartnershipKind.Institutional]: 'Акселератор, фонд, институт развития',
  [PartnershipKind.Other]: 'Иное',
};

/**
 * Одно заявленное стратегическое партнёрство. Заменило чекбокс `hasStrategicPartnerships`:
 * галочка открывала целый берковский потолок за одно нажатие, а внешнего реестра партнёрств,
 * которым её можно было бы подпереть, не существует (см. docs/valuation-methodology.md).
 */
export interface StartupPartnership {
  id: string;
  startupId: string;
  partnerName: string;
  website: string;
  kind: PartnershipKind;
  /** В чём партнёрство состоит. Именно это отличает запись от заглушки. */
  description: string | null;
  /**
   * Считает ли бэк запись проработанной. Приходит с сервера, а не выводится здесь: это драйвер
   * оценки, и клиент, угадавший правило иначе, объяснял бы оценку неверно.
   */
  isWorkedOut: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Проработанных записей, после которых пятый берковский фактор перестаёт расти. */
export const PARTNERSHIP_SATURATION_COUNT = 3;
