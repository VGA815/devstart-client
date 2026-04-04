import { Injectable, inject } from '@angular/core';
import { StartupCatalogStore } from './startup-catalog.store';
import { StartupFilters } from '../../../shared/models/startup.model';

@Injectable({ providedIn: 'root' })
export class StartupCatalogFacade {
  private readonly store = inject(StartupCatalogStore);

  readonly startups = this.store.startups;
  readonly loading  = this.store.loading;
  readonly error    = this.store.error;
  readonly filters  = this.store.filters;

  load(filters: StartupFilters = {}): void {
    this.store.loadStartups(filters);
  }
}
