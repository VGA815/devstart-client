import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Startup, StartupFilters } from '../../shared/models/startup.model';
import { StartupDto, mapStartupDto, CreateStartupRequestDto, UpdateStartupRequestDto } from '../../shared/models/dto/startup.dto';

@Injectable({ providedIn: 'root' })
export class StartupService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups`;

  getStartups(filters: StartupFilters = {}): Observable<Startup[]> {
    let params = new HttpParams();
    if (filters.page     != null) params = params.set('page', filters.page);
    if (filters.pageSize != null) params = params.set('pageSize', filters.pageSize);
    if (filters.stage    != null) params = params.set('stage', filters.stage);
    if (filters.location != null) params = params.set('location', filters.location);
    if (filters.isStopped != null) params = params.set('isStopped', filters.isStopped);

    return this.http.get<StartupDto[]>(this.base, { params }).pipe(
      map(list => list.map(mapStartupDto))
    );
  }

  getStartup(id: string): Observable<Startup> {
    return this.http.get<StartupDto>(`${this.base}/${id}`).pipe(
      map(mapStartupDto)
    );
  }

  getStartupsByProfile(profileId: string): Observable<Startup[]> {
    const params = new HttpParams().set('profileId', profileId);
    return this.http.get<StartupDto[]>(`${this.base}/users`, { params }).pipe(
      map(list => list.map(mapStartupDto))
    );
  }

  createStartup(body: CreateStartupRequestDto): Observable<string> {
    return this.http.post<string>(`${this.base}/`, body);
  }

  updateStartup(body: UpdateStartupRequestDto): Observable<void> {
    return this.http.put<void>(this.base, body);
  }

  deleteStartup(startupId: string): Observable<void> {
    const params = new HttpParams().set('startupId', startupId);
    return this.http.delete<void>(this.base, { params });
  }
}
