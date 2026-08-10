import { fractionToPct, pctToFraction } from './percent.utils';

describe('fractionToPct', () => {
  it('переводит долю в проценты', () => {
    expect(fractionToPct(0.2)).toBe(20);
    expect(fractionToPct(0.5)).toBe(50);
    expect(fractionToPct(0)).toBe(0);
  });

  it('гасит артефакты double', () => {
    expect(fractionToPct(0.07)).toBe(7);     // 0.07 * 100 === 7.000000000000001
    expect(fractionToPct(0.065)).toBe(6.5);
    expect(fractionToPct(0.29)).toBe(29);
  });

  it('null / undefined / NaN → null', () => {
    expect(fractionToPct(null)).toBeNull();
    expect(fractionToPct(undefined)).toBeNull();
    expect(fractionToPct(NaN)).toBeNull();
  });
});

describe('pctToFraction', () => {
  it('переводит проценты в долю', () => {
    expect(pctToFraction(20)).toBe(0.2);
    expect(pctToFraction(6.5)).toBe(0.065);
    expect(pctToFraction(0)).toBe(0);
  });

  it('null / undefined / NaN → null', () => {
    expect(pctToFraction(null)).toBeNull();
    expect(pctToFraction(undefined)).toBeNull();
    expect(pctToFraction(NaN)).toBeNull();
  });
});

describe('круговой перевод', () => {
  // Значения из спеки авто-условий: дисконт 20%, ставка 6%, и границы валидатора.
  it('доля → проценты → доля возвращает исходное', () => {
    for (const fraction of [0, 0.06, 0.065, 0.07, 0.2, 0.25, 0.3, 0.5]) {
      expect(pctToFraction(fractionToPct(fraction))).toBe(fraction);
    }
  });

  it('остаётся в серверных границах: дисконт ≤ 0.5, ставка ≤ 0.30', () => {
    expect(pctToFraction(50)).toBe(0.5);
    expect(pctToFraction(30)).toBe(0.3);
  });
});
