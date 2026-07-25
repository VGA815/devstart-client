import { ScoreFactorDto, StartupScoreDto, mapStartupScoreDto } from './startup-score.dto';

function factor(overrides: Partial<ScoreFactorDto> = {}): ScoreFactorDto {
  return {
    factor: 'Team', score: 60, weight: 0.25, source: 1, notes: ['ok'],
    ...overrides,
  };
}

function dto(overrides: Partial<StartupScoreDto> = {}): StartupScoreDto {
  return {
    totalScore: 62,
    teamScore: 60, marketScore: 55, productScore: 70, tractionScore: 40,
    competitionScore: 50,
    valuationLow: 1_000_000, valuationHigh: 3_000_000,
    methodsUsed: ['Berkus', 'Scorecard'],
    calculatedAt: '2026-07-24T10:00:00Z',
    factors: [factor()],
    ...overrides,
  };
}

describe('mapStartupScoreDto', () => {
  it('маппит factors и нормализует их notes/score', () => {
    const result = mapStartupScoreDto(dto({
      factors: [
        factor({ factor: 'Product', score: 75, weight: 0.2, source: 3, notes: null as unknown as string[] }),
        factor({ factor: 'Competition', score: null, weight: 0, source: 0, notes: [] }),
      ],
    }));

    expect(result.factors.length).toBe(2);
    expect(result.factors[0].factor).toBe('Product');
    expect(result.factors[0].source).toBe(3);       // Self | Platform — флаговое поле
    expect(result.factors[0].notes).toEqual([]);     // null → []
    expect(result.factors[1].score).toBeNull();      // выпавший фактор
    expect(result.factors[1].weight).toBe(0);
  });

  it('отсутствующий массив factors нормализуется в []', () => {
    const result = mapStartupScoreDto(dto({ factors: null }));
    expect(result.factors).toEqual([]);
  });

  it('сохраняет null у totalScore и competitionScore (недостаточно данных, а не 0)', () => {
    const result = mapStartupScoreDto(dto({ totalScore: null, competitionScore: null, factors: [] }));
    expect(result.totalScore).toBeNull();
    expect(result.competitionScore).toBeNull();
  });

  it('пробрасывает числовые баллы и диапазон оценки без изменений', () => {
    const result = mapStartupScoreDto(dto());
    expect(result.totalScore).toBe(62);
    expect(result.competitionScore).toBe(50);
    expect(result.valuationLow).toBe(1_000_000);
    expect(result.methodsUsed).toEqual(['Berkus', 'Scorecard']);
  });
});
