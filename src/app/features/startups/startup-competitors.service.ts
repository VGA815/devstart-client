import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupCompetitor } from '../../shared/models/startup-competitor.model';
import {
  StartupCompetitorDto,
  CreateStartupCompetitorRequestDto,
  UpdateStartupCompetitorRequestDto,
  mapStartupCompetitorDto,
} from '../../shared/models/dto/startup-competitor.dto';

@Injectable({ providedIn: 'root' })
export class StartupCompetitorsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  getByStartupId(startupId: string): Observable<StartupCompetitor[]> {
    return this.http.get<StartupCompetitorDto[]>(`${this.base}/startups/${startupId}/competitors`).pipe(
      map(list => list.map(mapStartupCompetitorDto))
    );
  }

  create(body: CreateStartupCompetitorRequestDto): Observable<string> {
    return this.http.post<string>(`${this.base}/startup-competitors`, body);
  }

  update(competitorId: string, body: UpdateStartupCompetitorRequestDto): Observable<void> {
    return this.http.put<void>(`${this.base}/startup-competitors/${competitorId}`, body);
  }

  delete(competitorId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/startup-competitors/${competitorId}`);
  }
}
