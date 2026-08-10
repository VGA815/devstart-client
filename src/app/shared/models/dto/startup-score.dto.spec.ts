import {
  ScoreFactorDto, StartupScoreDto, SuggestedTermsDto,
  mapStartupScoreDto, mapSuggestedTermsDto,
} from './startup-score.dto';

function factor(overrides: Partial<ScoreFactorDto> = {}): ScoreFactorDto {
  return {
    factor: 'Team', score: 60, weight: 0.25, source: 1, detail: null,
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
  it('маппит factors и нормализует их score', () => {
    const result = mapStartupScoreDto(dto({
      factors: [
        factor({ factor: 'Product', score: 75, weight: 0.2, source: 3 }),
        factor({ factor: 'Competition', score: null, weight: 0, source: 0 }),
      ],
    }));

    expect(result.factors.length).toBe(2);
    expect(result.factors[0].factor).toBe('Product');
    expect(result.factors[0].source).toBe(3);       // Self | Platform — флаговое поле
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

  describe('детализация фактора', () => {
    // Ответ мог быть посчитан до появления поля и лежать в часовом кэше бэка — не ошибка.
    it('отсутствующий detail нормализуется в пустую детализацию', () => {
      const result = mapStartupScoreDto(dto({ factors: [factor({ detail: null })] }));

      expect(result.factors[0].detail).toEqual({ components: [], inputs: [], hints: [] });
    });

    it('пустые массивы внутри detail нормализуются в []', () => {
      const result = mapStartupScoreDto(dto({
        factors: [factor({ detail: { components: null, inputs: null, hints: null } })],
      }));

      expect(result.factors[0].detail).toEqual({ components: [], inputs: [], hints: [] });
    });

    it('маппит components, inputs и hints', () => {
      const result = mapStartupScoreDto(dto({
        factors: [factor({
          factor: 'Product',
          score: 70,
          detail: {
            components: [
              { code: 'product.base.stage_mvp', points: 60 },
              { code: 'product.bonus.positioning', points: 5 },
              { code: 'product.bonus.roadmap', points: 5 },
            ],
            inputs: [
              { code: 'product.input.stage', value: { kind: 5, number: null, code: 'stage.mvp' } },
              { code: 'product.input.roadmap_items', value: { kind: 3, number: 4, code: null } },
            ],
            hints: [{ code: 'product.hint.roadmap', points: 5, targets: null, enablesFactor: null }],
          },
        })],
      }));

      const detail = result.factors[0].detail;
      expect(detail.components.map(c => c.points)).toEqual([60, 5, 5]);
      expect(detail.inputs[0].value.code).toBe('stage.mvp');
      expect(detail.inputs[1].value.number).toBe(4);
      expect(detail.hints[0].targets).toEqual([]);      // null → []
      expect(detail.hints[0].enablesFactor).toBeFalse(); // null → false
    });

    it('сохраняет kind/number/code у ScoreValue и enablesFactor у подсказки', () => {
      const result = mapStartupScoreDto(dto({
        factors: [factor({
          factor: 'Competition',
          score: null,
          weight: 0,
          detail: {
            components: [],
            inputs: [{ code: 'competition.input.sector_intensity', value: { kind: 0, number: null, code: null } }],
            hints: [{
              code: 'competition.hint.first_documented_card',
              points: 60,
              targets: [{ kind: 3, number: 1, code: null }],
              enablesFactor: true,
            }],
          },
        })],
      }));

      const detail = result.factors[0].detail;
      expect(detail.inputs[0].value.kind).toBe(0);      // «формула это читает, но данных нет»
      expect(detail.hints[0].enablesFactor).toBeTrue();
      expect(detail.hints[0].points).toBe(60);          // балл фактора, а не дельта
      expect(detail.hints[0].targets[0].number).toBe(1);
    });

    it('отсутствующий value у input нормализуется в «нет данных»', () => {
      const result = mapStartupScoreDto(dto({
        factors: [factor({
          detail: { components: [], inputs: [{ code: 'market.input.tam', value: null }], hints: [] },
        })],
      }));

      expect(result.factors[0].detail.inputs[0].value).toEqual({ kind: 0, number: null, code: null });
    });
  });
});

function termsDto(overrides: Partial<SuggestedTermsDto> = {}): SuggestedTermsDto {
  return {
    instrument: 1,
    suggestedValuationCap: 21_000_000,
    suggestedDiscount: 0.2,
    suggestedInterestRate: 0.06,
    suggestedTermMonths: 18,
    suggestedPreMoneyValuation: null,
    suggestedLiquidationPreference: 1,
    impliedInvestorSharePct: 24.13,
    warnings: [],
    scoreReference: 62,
    valuationLowReference: 12_000_000,
    valuationHighReference: 20_000_000,
    ...overrides,
  };
}

describe('mapSuggestedTermsDto', () => {
  // Бэкенд валидирует discount 0–0.5 и ставку 0–0.30 долями, а поля подписаны «%». Пока
  // перевода не было, авто-условия подставляли «0.2» в процентное поле.
  it('переводит доли ставок в проценты', () => {
    const result = mapSuggestedTermsDto(termsDto());

    expect(result.discountPct).toBe(20);
    expect(result.interestRatePct).toBe(6);
  });

  it('не тащит артефакты double при переводе', () => {
    const result = mapSuggestedTermsDto(termsDto({
      suggestedDiscount: 0.07,
      suggestedInterestRate: 0.065,
    }));

    expect(result.discountPct).toBe(7);        // не 7.000000000000001
    expect(result.interestRatePct).toBe(6.5);
  });

  it('суммы не трогает — они и так в ₽', () => {
    const result = mapSuggestedTermsDto(termsDto({ suggestedPreMoneyValuation: 50_000_000 }));

    expect(result.valuationCap).toBe(21_000_000);
    expect(result.preMoneyValuation).toBe(50_000_000);
  });

  it('сохраняет null у неприменимых к инструменту ставок', () => {
    const result = mapSuggestedTermsDto(termsDto({
      instrument: 2,
      suggestedDiscount: null,
      suggestedInterestRate: null,
      suggestedTermMonths: null,
      suggestedValuationCap: null,
    }));

    expect(result.discountPct).toBeNull();
    expect(result.interestRatePct).toBeNull();
    expect(result.termMonths).toBeNull();
    expect(result.valuationCap).toBeNull();
  });

  it('пробрасывает обоснование и долю инвестора', () => {
    const result = mapSuggestedTermsDto(termsDto());

    expect(result.impliedInvestorSharePct).toBe(24.13);
    expect(result.scoreReference).toBe(62);
    expect(result.valuationLowReference).toBe(12_000_000);
    expect(result.valuationHighReference).toBe(20_000_000);
  });

  it('маппит предупреждения по условиям сделки', () => {
    const result = mapSuggestedTermsDto(termsDto({
      warnings: [
        { code: 'deal_terms.high_dilution', severity: 'warning', message: 'Investor share above 30%…' },
        { code: 'deal_terms.amount_exceeds_cap', severity: 'warning', message: 'Invested amount…' },
      ],
    }));

    expect(result.warnings.length).toBe(2);
    expect(result.warnings[0].code).toBe('deal_terms.high_dilution');
    expect(result.warnings[1].severity).toBe('warning');
  });

  it('отсутствующий массив warnings нормализуется в []', () => {
    const result = mapSuggestedTermsDto(termsDto({ warnings: null }));
    expect(result.warnings).toEqual([]);
  });
});
