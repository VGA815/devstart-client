import { HttpErrorResponse } from '@angular/common/http';

/** Причина, по которой локально не удалось получить токен (до отправки запроса на бэкенд). */
export type CaptchaFailureReason = 'unavailable' | 'timeout' | 'dismissed';

export class CaptchaError extends Error {
  constructor(readonly reason: CaptchaFailureReason) {
    super(`captcha: ${reason}`);
    this.name = 'CaptchaError';
  }
}

/**
 * Возвращает русское сообщение для ошибки капчи — локальной (CaptchaError) или серверной
 * (RFC7807 c title Captcha.*), либо null, если ошибка вообще не про капчу.
 *
 * Отдельный хелпер, а не общий apiErrorMessage(): тот подставил бы серверный `detail`, а на
 * логине это английская строка «The user with the specified email was not found», которая ещё и
 * разглашает существование аккаунта. Поэтому auth-формы разбирают только капчу, а остальные
 * ветки оставляют как были.
 */
export function captchaErrorMessage(err: unknown): string | null {
  if (err instanceof CaptchaError) {
    return err.reason === 'timeout'
      ? 'Проверка безопасности не ответила вовремя. Попробуйте ещё раз.'
      : 'Не удалось пройти проверку безопасности. Обновите страницу и попробуйте снова.';
  }

  if (!(err instanceof HttpErrorResponse)) { return null; }

  const title = (err.error as { title?: string } | null)?.title ?? '';
  switch (title) {
    case 'Captcha.Missing':
    case 'Captcha.Failed':
      return 'Проверка безопасности не пройдена. Обновите страницу и попробуйте снова.';
    case 'Captcha.Unavailable':
      return 'Сервис проверки временно недоступен. Попробуйте через минуту.';
    default:
      return null;
  }
}
