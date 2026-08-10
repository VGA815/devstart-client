/**
 * Конвертация «доля ↔ проценты» на границе API.
 *
 * Бэкенд хранит и валидирует discount / interest rate / прочие ставки **долями**: дисконт
 * 0–0.5, ставка по конвертируемому займу 0–0.30 (см. CreateInvestmentApplicationCommandValidator).
 * Пользователю же везде показываем и у него же спрашиваем проценты — 20, а не 0.2.
 *
 * Поэтому все клиентские модели держат такие поля с суффиксом `Pct`, а перевод происходит
 * ровно в двух местах: в маппере DTO (входящее) и при сборке payload (исходящее). Суффикс в
 * имени — часть защиты: поле без него означает долю, и перепутать их молча уже не выйдет.
 */

/** Доля с бэкенда → проценты для UI: 0.2 → 20, 0.065 → 6.5. */
export function fractionToPct(fraction: number): number;
export function fractionToPct(fraction: number | null | undefined): number | null;
export function fractionToPct(fraction: number | null | undefined): number | null {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return null;
  // Округление против артефактов double: 0.07 * 100 иначе даёт 7.000000000000001.
  return Math.round(fraction * 1e6) / 1e4;
}

/** Проценты из UI → доля для бэкенда: 20 → 0.2, 6.5 → 0.065. */
export function pctToFraction(pct: number): number;
export function pctToFraction(pct: number | null | undefined): number | null;
export function pctToFraction(pct: number | null | undefined): number | null {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  return Math.round(pct * 1e4) / 1e6;
}
