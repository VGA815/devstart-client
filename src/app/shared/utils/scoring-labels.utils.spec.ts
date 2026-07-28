import { ScoreValue } from '../models/startup-score.model';
import {
  formatHintTargets, formatPoints, formatScoreValue,
  getComponentLabel, getHintLabel, getInputLabel, getValueCodeLabel,
} from './scoring-labels.utils';

function value(kind: number, number: number | null = null, code: string | null = null): ScoreValue {
  return { kind, number, code };
}

describe('scoring-labels.utils', () => {
  describe('подписи по кодам', () => {
    it('переводит известные коды', () => {
      expect(getComponentLabel('product.base.stage_mvp')).toBe('Стадия: MVP');
      expect(getInputLabel('market.input.tam')).toBe('TAM');
      expect(getHintLabel('product.hint.roadmap')).toBe('Добавить пункты в план развития');
      expect(getValueCodeLabel('position.cto')).toBe('CTO');
    });

    // Коды append-only: новый код с бэка не должен ломать вкладку — и врать подписью тоже нельзя.
    it('неизвестный код показывает как есть', () => {
      expect(getComponentLabel('product.bonus.unknown')).toBe('product.bonus.unknown');
      expect(getInputLabel('market.input.unknown')).toBe('market.input.unknown');
      expect(getHintLabel('team.hint.unknown')).toBe('team.hint.unknown');
      expect(getValueCodeLabel('stage.unknown')).toBe('stage.unknown');
    });
  });

  describe('formatScoreValue', () => {
    it('kind 0 — значения нет', () => {
      expect(formatScoreValue(value(0))).toBe('не заполнено');
    });

    it('kind 1 — сумма в рублях', () => {
      expect(formatScoreValue(value(1, 1_000_000_000))).toContain('₽');
    });

    it('kind 2 — проценты', () => {
      expect(formatScoreValue(value(2, 14))).toBe('14%');
    });

    it('kind 3 — количество', () => {
      expect(formatScoreValue(value(3, 4))).toBe('4');
    });

    it('kind 4 — флаг', () => {
      expect(formatScoreValue(value(4, 1))).toBe('да');
      expect(formatScoreValue(value(4, 0))).toBe('нет');
    });

    it('kind 5 — код значения через словарь', () => {
      expect(formatScoreValue(value(5, null, 'stage.seed'))).toBe('seed');
    });

    it('kind 6 — балл по шкале 0..100', () => {
      expect(formatScoreValue(value(6, 80))).toBe('80 из 100');
    });

    it('незнакомый kind не ломает рендер', () => {
      expect(formatScoreValue(value(99, 5))).toBe('не заполнено');
    });
  });

  describe('formatPoints', () => {
    it('добавляет знак, ноль показывает как +0', () => {
      expect(formatPoints(10)).toBe('+10');
      expect(formatPoints(0)).toBe('+0');
    });

    it('отрицательное слагаемое (ограничение шкалы) — с минусом', () => {
      expect(formatPoints(-5)).toBe('−5');
    });
  });

  describe('formatHintTargets', () => {
    it('составное условие соединяет разделителем', () => {
      expect(formatHintTargets([value(1, 1_000_000), value(2, 10)])).toContain(' · ');
      expect(formatHintTargets([value(2, 10)])).toBe('10%');
      expect(formatHintTargets([])).toBe('');
    });
  });
});
