import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlatformStats } from '../../shared/models/stats.model';
import { StatsDto, mapStatsDto } from '../../shared/models/dto/stats.dto';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/stats`;

  getStats(): Observable<PlatformStats> {
    return this.http.get<StatsDto>(this.url).pipe(map(mapStatsDto));
  }
}
