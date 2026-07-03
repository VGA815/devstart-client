import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupInvestor } from '../../shared/models/startup-investor.model';

@Injectable({ providedIn: 'root' })
export class StartupInvestorsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups`;

  // Returns only the investors who chose to be public in the startup's list.
  getByStartup(startupId: string): Observable<StartupInvestor[]> {
    return this.http.get<StartupInvestor[]>(`${this.base}/${startupId}/investors`);
  }

  create(startupId: string, profileId: string, isPublic: boolean): Observable<unknown> {
    return this.http.post(`${this.base}/investors`, {
      startup_id: startupId,
      profile_id: profileId,
      is_public: isPublic,
    });
  }

  // Toggles the CALLER's own row visibility; 404 when the caller is not an investor
  // of this startup.
  changeVisibility(startupId: string, isPublic: boolean): Observable<void> {
    return this.http.put<void>(`${this.base}/investors`, {
      startup_id: startupId,
      is_public: isPublic,
    });
  }
}
