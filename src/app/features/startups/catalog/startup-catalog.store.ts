import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { pipe, tap, switchMap, exhaustMap, filter } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { Startup, StartupFilters } from '../../../shared/models/startup.model';
import { StartupService } from '../startup.service';

/**
 * Размер страницы каталога. Держим маленьким осознанно: на каждый стартап в
 * списке приходится ещё запрос аватарки, поэтому страница в 50 карточек давала
 * около сотни XHR на первый экран.
 */
export const CATALOG_PAGE_SIZE = 12;

interface StartupCatalogState {
  startups: Startup[];
  /** Загрузка первой страницы — показываем скелетоны. */
  loading: boolean;
  /** Догрузка следующей страницы — список уже на экране. */
  loadingMore: boolean;
  /** Последняя страница пришла полной ⇒ дальше, вероятно, есть ещё. */
  hasMore: boolean;
  error: string | null;
  filters: StartupFilters;
}

const initialState: StartupCatalogState = {
  startups: [],
  loading: false,
  loadingMore: false,
  hasMore: false,
  error: null,
  filters: { page: 1, pageSize: CATALOG_PAGE_SIZE },
};

/** Бэк отдаёт голый массив без total, так что «есть ещё» выводим из полноты страницы. */
function pageWasFull(received: Startup[], filters: StartupFilters): boolean {
  return received.length >= (filters.pageSize ?? CATALOG_PAGE_SIZE);
}

export const StartupCatalogStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, service = inject(StartupService)) => ({
    loadStartups: rxMethod<StartupFilters>(
      pipe(
        tap(filters => patchState(store, { loading: true, loadingMore: false, filters })),
        switchMap(filters =>
          service.getStartups(filters).pipe(
            tapResponse({
              next: (startups: Startup[]) => patchState(store, {
                startups,
                hasMore: pageWasFull(startups, filters),
                loading: false,
              }),
              error: (err: unknown) => patchState(store, {
                error: String(err),
                hasMore: false,
                loading: false,
              }),
            })
          )
        )
      )
    ),

    /** Догружает следующую страницу и дописывает её в конец списка. */
    loadMoreStartups: rxMethod<void>(
      pipe(
        filter(() => store.hasMore() && !store.loading() && !store.loadingMore()),
        tap(() => patchState(store, { loadingMore: true })),
        // exhaustMap: повторные клики по «Показать ещё» игнорируются, пока
        // предыдущая страница в полёте — иначе один и тот же page уйдёт дважды.
        exhaustMap(() => {
          const next: StartupFilters = {
            ...store.filters(),
            page: (store.filters().page ?? 1) + 1,
          };
          return service.getStartups(next).pipe(
            tapResponse({
              next: (page: Startup[]) => patchState(store, {
                // Бэк поднимает isFeatured-стартапы наверх, поэтому между
                // страницами карточка может повториться — @for падает на
                // дублирующемся track-ключе, отсеиваем по id.
                startups: dedupeById(store.startups(), page),
                filters: next,
                hasMore: pageWasFull(page, next),
                loadingMore: false,
              }),
              error: (err: unknown) => patchState(store, {
                error: String(err),
                loadingMore: false,
              }),
            })
          );
        })
      )
    ),
  }))
);

function dedupeById(current: Startup[], incoming: Startup[]): Startup[] {
  const seen = new Set(current.map(s => s.id));
  return [...current, ...incoming.filter(s => !seen.has(s.id))];
}
