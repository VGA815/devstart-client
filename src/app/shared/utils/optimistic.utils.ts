import { WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';

export function optimisticDelete<T>(
  signal: WritableSignal<T[]>,
  predicate: (item: T) => boolean,
  request: Observable<unknown>,
  reload: () => void,
): void {
  signal.update(list => list.filter(item => !predicate(item)));
  request.subscribe({ error: () => reload() });
}

export function optimisticPatch<T>(
  signal: WritableSignal<T[]>,
  predicate: (item: T) => boolean,
  patch: Partial<T>,
  request: Observable<unknown>,
  reload: () => void,
): void {
  signal.update(list => list.map(item => (predicate(item) ? { ...item, ...patch } : item)));
  request.subscribe({ error: () => reload() });
}
