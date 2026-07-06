import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CapTable } from '../../shared/models/startup-equity.model';
import {
  CapTableDto,
  SetCapTableRequestDto,
  mapCapTableDto,
} from '../../shared/models/dto/startup-equity.dto';

@Injectable({ providedIn: 'root' })
export class StartupEquityService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups`;

  // Founder-or-admin only; 403 for other members.
  getCapTable(startupId: string): Observable<CapTable> {
    return this.http.get<CapTableDto>(`${this.base}/${startupId}/cap-table`).pipe(
      map(mapCapTableDto)
    );
  }

  // Replaces the whole table atomically; percentages must sum to exactly 100%.
  setCapTable(startupId: string, body: SetCapTableRequestDto): Observable<void> {
    return this.http.put<void>(`${this.base}/${startupId}/cap-table`, body);
  }
}
