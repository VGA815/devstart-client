import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { UserPreferencesService } from '../preferences/user-preferences.service';
import { CaptchaError } from './captcha-error';

/** Подмножество API виджета SmartCaptcha, которым мы пользуемся. */
interface SmartCaptchaApi {
  render(container: HTMLElement, params: Record<string, unknown>): number;
  execute(widgetId: number): void;
  reset(widgetId: number): void;
  destroy?(widgetId: number): void;
}

declare global {
  interface Window { smartCaptcha?: SmartCaptchaApi; }
}

const SCRIPT_SRC = 'https://smartcaptcha.yandexcloud.net/captcha.js';
const ONLOAD_CALLBACK = '__dsSmartCaptchaOnload';
const CONTAINER_ID = 'ds-captcha';
/** Верхняя граница ожидания токена: включает время, пока подозрительный юзер решает задание. */
const EXECUTE_TIMEOUT_MS = 120_000;

/**
 * Yandex SmartCaptcha в невидимом режиме.
 *
 * Сервис, а не компонент: в invisible-режиме виджет ничего не рисует, поэтому формам нужен не
 * элемент шаблона, а функция, которую можно дождаться перед отправкой. Вызывает её не сама форма,
 * а captchaInterceptor — так один клик «Зарегистрироваться», порождающий два защищённых запроса
 * (register + login), получает два разных токена: они одноразовые.
 *
 * Полностью выключается (скрипт не грузится, контейнер не создаётся) при пустом
 * environment.captchaSiteKey — так же, как MatomoService при пустом matomoUrl. Это дефолт для
 * `ng serve`, юнит-тестов и обычного `ng build`.
 */
@Injectable({ providedIn: 'root' })
export class CaptchaService {
  private readonly doc = inject(DOCUMENT);
  private readonly prefs = inject(UserPreferencesService);

  /** false → каждый метод сервиса становится no-op. */
  readonly enabled = !!environment.captchaSiteKey;

  /** Скрипт загружен и виджет отрисован. Информационный сигнал. */
  readonly ready = signal(false);
  /** Последний execute() не смог выдать токен (скрипт заблокирован, таймаут, отказ). */
  readonly failed = signal(false);

  private scriptLoaded?: Promise<void>;
  private widgetId?: number;
  private container?: HTMLElement;
  private renderedTheme?: 'dark' | 'light';
  private pending?: { resolve: (token: string) => void; reject: (err: unknown) => void };
  private pendingTimer?: ReturnType<typeof setTimeout>;
  /** Виджет один, а запросы могут идти подряд — прогоняем execute() строго по очереди. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor() {
    if (!this.enabled) { return; }

    // Оформление виджета фиксируется в момент render(), менять его на лету нечем — поэтому при
    // смене темы уничтожаем виджет, и следующий execute() отрисует его заново. Дёшево: невидимый
    // виджет между вызовами ничего не делает.
    effect(() => {
      const theme = this.prefs.effective();
      if (this.widgetId !== undefined && theme !== this.renderedTheme) {
        window.smartCaptcha?.destroy?.(this.widgetId);
        this.widgetId = undefined;
        this.ready.set(false);
      }
    });
  }

  /**
   * Выдаёт одноразовый токен. Резолвится в null, когда капча выключена. Бросает CaptchaError,
   * если токен получить не удалось. Безопасно вызывать подряд — вызовы сериализуются.
   */
  execute(): Promise<string | null> {
    if (!this.enabled) { return Promise.resolve(null); }

    const run = this.queue.then(() => this.executeOnce());
    // Очередь не должна «залипать» на отвергнутом промисе, иначе один сбой сломает все следующие.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async executeOnce(): Promise<string> {
    await this.loadScript();

    const api = window.smartCaptcha;
    if (!api) { throw new CaptchaError('unavailable'); }

    if (this.widgetId === undefined) {
      this.renderedTheme = this.prefs.effective();
      this.widgetId = api.render(this.ensureContainer(), {
        sitekey: environment.captchaSiteKey,
        invisible: true,
        hl: 'ru',
        // Тестовый режим в dev-сборках: виджет всегда отдаёт токен, который тестовый серверный
        // ключ принимает. В проде это должно быть выключено.
        test: !environment.production,
        callback: (token: string) => this.settle(token),
      });
      this.ready.set(true);
    }

    this.failed.set(false);

    // Сброс ДО execute(), а не после: прогон, упавший на полпути, иначе оставит израсходованный
    // токен защёлкнутым в виджете, и следующая отправка уйдёт с ним же — сервер её отвергнет.
    api.reset(this.widgetId);

    try {
      return await new Promise<string>((resolve, reject) => {
        this.pending = { resolve, reject };
        this.pendingTimer = setTimeout(() => this.fail(new CaptchaError('timeout')), EXECUTE_TIMEOUT_MS);
        api.execute(this.widgetId!);
      });
    } catch (err) {
      this.failed.set(true);
      throw err;
    }
  }

  private loadScript(): Promise<void> {
    // Одноразово и разделяемо: параллельные execute() ждут один и тот же промис.
    return (this.scriptLoaded ??= new Promise<void>((resolve, reject) => {
      (window as unknown as Record<string, unknown>)[ONLOAD_CALLBACK] = () => resolve();

      const script = this.doc.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = `${SCRIPT_SRC}?render=onload&onload=${ONLOAD_CALLBACK}`;
      script.onerror = () => {
        // Сбрасываем кеш промиса, чтобы следующая попытка могла загрузить скрипт заново
        // (например, после того как пользователь отключил блокировщик).
        this.scriptLoaded = undefined;
        reject(new CaptchaError('unavailable'));
      };
      this.doc.head.appendChild(script);
    }));
  }

  private ensureContainer(): HTMLElement {
    if (!this.container) {
      this.container = this.doc.createElement('div');
      this.container.id = CONTAINER_ID;
      // Намеренно без display:none и без выноса за экран: даже в невидимом режиме виджету нужна
      // живая точка монтирования, чтобы показать модалку с заданием подозрительному посетителю.
      this.doc.body.appendChild(this.container);
    }
    return this.container;
  }

  /**
   * Колбэк прилетает из стороннего скрипта, вне Angular. Приложение zoneless, но CD здесь и не
   * нужен: сам токен ничего не рендерит, а рендерящиеся ready/failed — сигналы, и стейт формы
   * пишется в сигналы внутри subscribe().
   */
  private settle(token: string): void {
    this.clearTimer();
    this.pending?.resolve(token);
    this.pending = undefined;
  }

  private fail(err: unknown): void {
    this.clearTimer();
    this.pending?.reject(err);
    this.pending = undefined;
  }

  private clearTimer(): void {
    if (this.pendingTimer !== undefined) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = undefined;
    }
  }
}
