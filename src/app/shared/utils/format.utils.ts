/**
 * < 1h: "X мин назад" / "только что"
 * < 24h: "X ч назад"
 * < 7d:  "X дн назад"
 * else:  "12 апр" (locale date)
 */
export function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';

  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1)  return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24)   return `${hours} ч назад`;
  if (days < 7)     return `${days} дн назад`;
  return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

/**
 * - null/0  → "—"
 * - >= 1M   → "₽1.5M"
 * - else    → "₽250K"
 */
export function formatMoney(amount: number | null | undefined): string {
  if (!amount) return '—';
  if (amount >= 1_000_000) return `₽${(amount / 1_000_000).toFixed(1)}M`;
  return `₽${(amount / 1000).toFixed(0)}K`;
}

/**
 * "Q1 2026" format from an ISO date
 */
export function formatQuarter(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}
