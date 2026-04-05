import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupMetric } from '../../shared/models/startup-metric.model';
import { StartupMetricDto, mapStartupMetricDto } from '../../shared/models/dto/startup-metric.dto';

@Injectable({ providedIn: 'root' })
export class StartupMetricsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups`;

  getMetrics(startupId: string): Observable<StartupMetric[]> {
    return this.http.get<StartupMetricDto[]>(`${this.base}/${startupId}/metrics`).pipe(
      map(list => list.map(mapStartupMetricDto))
    );
  }

  addMetric(body: { startup_id: string; metric_type: number; value: number }): Observable<string> {
    return this.http.post<string>(`${this.base}/metrics`, body);
  }

  updateMetric(body: { id: string; startup_id: string; metric_type: number; value: number }): Observable<void> {
    return this.http.put<void>(`${this.base}/metrics`, body);
  }

  getMetricById(metricId: string): Observable<StartupMetric> {
    return this.http.get<StartupMetricDto>(`${this.base}/metrics/${metricId}`).pipe(
      map(mapStartupMetricDto)
    );
  }

  deleteMetric(metricId: string): Observable<void> {
    const params = new HttpParams().set('metricId', metricId);
    return this.http.delete<void>(`${this.base}/metrics`, { params });
  }
}
