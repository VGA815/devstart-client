/**
 * Контрольные суммы ИНН и ОГРН — зеркало серверной проверки (`RussianTaxId` в домене).
 * Локально и мгновенно ловят опечатку до отправки формы; про принадлежность номера они не говорят
 * ничего: чужой корректный ИНН проходит проверку так же, как свой.
 */

const INN_10 = [2, 4, 10, 3, 5, 9, 4, 6, 8];
const INN_12_FIRST = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8];
const INN_12_SECOND = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8];

function digitsOnly(value: string): string | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

function checkDigit(digits: string, weights: number[], controlIndex: number): boolean {
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  return (sum % 11) % 10 === Number(digits[controlIndex]);
}

export function isValidInn(value: string): boolean {
  const digits = digitsOnly(value);
  // Первые две цифры — код региона, «00» не бывает: пустышка вида 0000000000 арифметику проходит.
  if (!digits || digits.startsWith('00')) return false;

  if (digits.length === 10) return checkDigit(digits, INN_10, 9);
  if (digits.length === 12) {
    return checkDigit(digits, INN_12_FIRST, 10) && checkDigit(digits, INN_12_SECOND, 11);
  }
  return false;
}

export function isValidOgrn(value: string): boolean {
  const digits = digitsOnly(value);
  if (!digits || digits[0] < '1' || digits[0] > '5') return false;

  const divisor = digits.length === 13 ? 11 : digits.length === 15 ? 13 : 0;
  if (divisor === 0) return false;

  // BigInt: 14 цифр не помещаются в number без потери точности.
  const leading = BigInt(digits.slice(0, digits.length - 1));
  const control = Number(leading % BigInt(divisor)) % 10;
  return control === Number(digits[digits.length - 1]);
}
