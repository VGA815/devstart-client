import { isValidInn, isValidOgrn } from './tax-id.utils';

describe('tax-id.utils', () => {
  it('принимает корректные ИНН', () => {
    expect(isValidInn('7707083893')).toBeTrue();    // юрлицо, 10 цифр
    expect(isValidInn('7736207543')).toBeTrue();
    expect(isValidInn('500100732259')).toBeTrue();  // ИП, 12 цифр
    expect(isValidInn(' 7707083893 ')).toBeTrue();
  });

  it('отклоняет опечатки, неверную длину и пустышки', () => {
    expect(isValidInn('7707083894')).toBeFalse();
    expect(isValidInn('770708389')).toBeFalse();
    expect(isValidInn('77070838931')).toBeFalse();
    expect(isValidInn('7707-083893')).toBeFalse();
    // Арифметику проходит, но код региона «00» не существует.
    expect(isValidInn('0000000000')).toBeFalse();
    expect(isValidInn('')).toBeFalse();
  });

  it('принимает корректные ОГРН и ОГРНИП', () => {
    expect(isValidOgrn('1027700132195')).toBeTrue();
    expect(isValidOgrn('304500116000157')).toBeTrue();
  });

  it('отклоняет неверные ОГРН', () => {
    expect(isValidOgrn('1027700132196')).toBeFalse();
    expect(isValidOgrn('102770013219')).toBeFalse();
    expect(isValidOgrn('0000000000000')).toBeFalse();
    expect(isValidOgrn('')).toBeFalse();
  });

  // Проверка контрольной суммы говорит только о форме номера: чужой корректный ИНН проходит её так
  // же, как свой. Именно поэтому ни одна формулировка в UI не называет совпадение подтверждением.
  it('не говорит ничего о принадлежности номера', () => {
    expect(isValidInn('7707083893')).toBeTrue();
    expect(isValidInn('7736207543')).toBeTrue();
  });
});
