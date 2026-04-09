import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpertCatalogFilters, ExpertProfile } from '../../shared/models/expert-profile.model';
import {
  ExpertProfileDto, mapExpertProfileDto,
  CreateExpertProfileRequestDto, UpdateExpertProfileRequestDto,
  SPEC_NUM,
} from '../../shared/models/dto/expert-profile.dto';

@Injectable({ providedIn: 'root' })
export class ExpertProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/expert-profiles`;

  getPublicProfiles(filters: ExpertCatalogFilters = {}): Observable<ExpertProfile[]> {
    let params = new HttpParams();
    if (filters.page           != null) params = params.set('page', filters.page);
    if (filters.pageSize       != null) params = params.set('pageSize', filters.pageSize);
    if (filters.specialization != null) params = params.set('specialization', SPEC_NUM[filters.specialization]);
    if (filters.sortBy         != null) params = params.set('sortBy', filters.sortBy);
    return this.http.get<ExpertProfileDto[]>(this.base, { params }).pipe(
      map(list => list.map(mapExpertProfileDto))
    );
  }

  getById(userId: string): Observable<ExpertProfile> {
    return this.http.get<ExpertProfileDto>(`${this.base}/${userId}`).pipe(
      map(mapExpertProfileDto)
    );
  }

  create(body: CreateExpertProfileRequestDto): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(body: UpdateExpertProfileRequestDto): Observable<void> {
    return this.http.put<void>(this.base, body);
  }
}
