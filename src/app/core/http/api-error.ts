import { HttpErrorResponse } from '@angular/common/http';

/** Форма ошибки в `errors[]` ProblemDetails, которую собирает ValidationDecorator на бэкенде. */
interface ApiErrorItem {
  code?: string;
  description?: string;
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  errors?: ApiErrorItem[];
}

/**
 * Достаёт человекочитаемое сообщение из ответа API.
 *
 * Бэкенд отвечает ProblemDetails: `detail` — общее описание, `errors[]` — конкретные нарушения
 * валидации. Показываем именно их, а не одну общую фразу: «'PublicEmail' is not a valid email
 * address» подсказывает, что чинить, а «Не удалось сохранить» — нет.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;

  if (err.status === 0) return 'Нет связи с сервером. Проверьте подключение.';
  if (err.status === 401) return 'Сессия истекла — войдите заново.';
  if (err.status === 403) return 'Недостаточно прав для этого действия.';
  if (err.status >= 500) return 'Ошибка на сервере. Попробуйте позже.';

  const body = err.error as ProblemDetails | string | null;
  if (typeof body === 'string' && body.trim()) return body;
  if (!body || typeof body !== 'object') return fallback;

  const details = (body.errors ?? [])
    .map(e => e.description?.trim())
    .filter((d): d is string => !!d);
  if (details.length) return details.join(' ');

  return body.detail?.trim() || body.title?.trim() || fallback;
}
