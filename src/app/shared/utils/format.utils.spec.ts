import { formatMoney, formatRub } from './format.utils';

describe('formatRub', () => {
  it('компактно форматирует крупные суммы рынка', () => {
    // Ровно тот случай, ради которого понадобился отдельный форматтер: formatMoney даёт "₽10000.0M".
    expect(formatMoney(10_000_000_000)).toBe('₽10000.0M');

    const tenBillion = formatRub(10_000_000_000);
    expect(tenBillion).toContain('₽');
    expect(tenBillion).not.toContain('10000');
  });

  it('форматирует миллиард и ноль', () => {
    expect(formatRub(1_000_000_000)).toContain('₽');
    expect(formatRub(0)).toContain('0');
  });

  it('пустое значение показывает прочерком', () => {
    expect(formatRub(null)).toBe('—');
    expect(formatRub(undefined)).toBe('—');
  });

  // 0 — законное значение метрики, а не «нет данных»: в отличие от formatMoney не схлопываем в «—».
  it('ноль не превращается в прочерк', () => {
    expect(formatRub(0)).not.toBe('—');
    expect(formatMoney(0)).toBe('—');
  });
});
