import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { CaptchaService } from './captcha.service';

export const CAPTCHA_HEADER = 'X-Captcha-Token';

/**
 * Зеркалит серверный список .RequireCaptcha(). Рассинхрон проявится как 400 Captcha.Missing,
 * из которого форма не может выбраться, — при правке держите оба списка вместе.
 */
const PROTECTED = [
  /\/users\/register$/,
  /\/users\/login$/,
  /\/users\/forgot-password$/,
  /\/users\/reset-password$/,
  /\/email-verification\/resend/,   // дальше идёт query string, поэтому без $
  /\/auth\/2fa\/verify$/,
  /\/auth\/2fa\/setup$/,
  /\/auth\/2fa\/setup\/confirm$/,
  /\/auth\/oauth\/complete$/,
  // [^/]+ не перешагивает слэш, поэтому ловит .../google/start, но НЕ .../google/link/start:
  // тот аутентифицирован, капчей не защищён и остаётся единственным живым OAuth-путём в продукте.
  /\/auth\/oauth\/[^/]+\/start$/,
];

/**
 * Добывает свежий одноразовый токен SmartCaptcha и вешает его заголовком на защищённые запросы.
 *
 * Именно интерцептор, а не вызов в submit() каждой формы: AuthService.register() внутри себя
 * делает второй запрос (login), и на него нужен свой токен. Плюс так покрываются места,
 * которые легко забыть, — экран согласий и страница подтверждения почты.
 */
export const captchaInterceptor: HttpInterceptorFn = (req, next) => {
  const captcha = inject(CaptchaService);

  if (!captcha.enabled || !PROTECTED.some(re => re.test(req.url))) {
    return next(req);
  }

  return from(captcha.execute()).pipe(
    switchMap(token =>
      next(token ? req.clone({ setHeaders: { [CAPTCHA_HEADER]: token } }) : req)),
  );
};
