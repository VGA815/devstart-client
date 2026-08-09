import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';

/**
 * Подгружает чанк лениво загружаемого роута заранее — но только для роутов,
 * помеченных `data: { preload: true }`, и только когда браузер простаивает.
 *
 * `PreloadAllModules` здесь не годится: лениво загружаемых роутов около сорока,
 * вместе с админкой это ~1.9 МБ JS, который скачался бы у каждого анонимного
 * посетителя лендинга. Помечаем только те переходы, которые реально следуют
 * за первым экраном.
 */
@Injectable({ providedIn: 'root' })
export class IdlePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] !== true) return of(null);
    return whenIdle().pipe(switchMap(() => load()));
  }
}

/** requestIdleCallback там, где он есть; иначе — отложенный макротаск. */
function whenIdle(): Observable<void> {
  return new Observable<void>(subscriber => {
    const done = () => { subscriber.next(); subscriber.complete(); };

    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(done, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }

    const id = setTimeout(done, 2000);
    return () => clearTimeout(id);
  });
}
