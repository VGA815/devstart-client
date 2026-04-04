import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { pipe, tap, switchMap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { Startup, StartupFilters } from '../../../shared/models/startup.model';
import { StartupService } from '../startup.service';

interface StartupCatalogState {
  startups: Startup[];
  loading: boolean;
  error: string | null;
  filters: StartupFilters;
}

const initialState: StartupCatalogState = {
  startups: [],
  loading: false,
  error: null,
  filters: { page: 1, pageSize: 12 },
};

export const StartupCatalogStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, service = inject(StartupService)) => ({
    loadStartups: rxMethod<StartupFilters>(
      pipe(
        tap(filters => patchState(store, { loading: true, filters })),
        switchMap(filters =>
          service.getStartups(filters).pipe(
            tapResponse({
              next: (startups: Startup[]) => patchState(store, { startups, loading: false }),
              error: (err: unknown) => patchState(store, { error: String(err), loading: false }),
            })
          )
        )
      )
    ),
  }))
);
