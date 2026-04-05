import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupRoadmapItem } from '../../shared/models/startup-roadmap.model';
import { StartupRoadmapItemDto, mapStartupRoadmapItemDto } from '../../shared/models/dto/startup-roadmap.dto';

/** Ensure a date string ("YYYY-MM-DD" or ISO) is sent as UTC ISO-8601.
 *  PostgreSQL timestamptz rejects DateTime with Kind=Unspecified. */
function toUtcIso(date: string): string {
  if (date.endsWith('Z') || date.includes('+')) return date; // already has TZ
  if (date.length === 10) return date + 'T00:00:00Z';        // "YYYY-MM-DD"
  return date + 'Z';
}

@Injectable({ providedIn: 'root' })
export class StartupRoadmapService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups`;

  getRoadmapItems(startupId: string): Observable<StartupRoadmapItem[]> {
    return this.http.get<StartupRoadmapItemDto[]>(`${this.base}/${startupId}/roadmap/items`).pipe(
      map(list => list.map(mapStartupRoadmapItemDto))
    );
  }

  addItem(body: {
    startup_id: string;
    startup_stage: number;
    title: string;
    status: number;
    description?: string;
    target_date: string;
    target_amount?: number;
  }): Observable<string> {
    return this.http.post<string>(`${this.base}/roadmap/items`, {
      ...body,
      target_date: toUtcIso(body.target_date),
    });
  }

  updateItem(body: {
    startup_id: string;
    item_id: string;
    startup_stage: number;
    title: string;
    status: number;
    description?: string;
    target_date: string;
    target_amount?: number;
  }): Observable<void> {
    return this.http.put<void>(`${this.base}/roadmap/items`, {
      ...body,
      target_date: toUtcIso(body.target_date),
    });
  }

  deleteItem(itemId: string): Observable<void> {
    const params = new HttpParams().set('itemId', itemId);
    return this.http.delete<void>(`${this.base}/roadmap/items`, { params });
  }
}
