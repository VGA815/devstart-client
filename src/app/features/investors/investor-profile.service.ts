import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvestorCatalogFilters, InvestorProfile, InvestorProfileType } from '../../shared/models/investor-profile.model';
import {
  InvestorProfileDto, mapInvestorProfileDto,
  CreateInvestorProfileRequestDto, UpdateInvestorProfileRequestDto,
} from '../../shared/models/dto/investor-profile.dto';

const TYPE_NUM: Record<InvestorProfileType, number> = { Individual: 0, Fund: 1 };

@Injectable({ providedIn: 'root' })
export class InvestorProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/investor-profiles`;

  getPublicProfiles(filters: InvestorCatalogFilters = {}): Observable<InvestorProfile[]> {
    let params = new HttpParams();
    if (filters.page     != null) params = params.set('page', filters.page);
    if (filters.pageSize != null) params = params.set('pageSize', filters.pageSize);
    if (filters.type     != null) params = params.set('type', TYPE_NUM[filters.type]);
    if (filters.sortBy   != null) params = params.set('sortBy', filters.sortBy);
    return this.http.get<InvestorProfileDto[]>(this.base, { params }).pipe(
      map(list => list.map(mapInvestorProfileDto))
    );
  }

  getById(userId: string): Observable<InvestorProfile> {
    return this.http.get<InvestorProfileDto>(`${this.base}/${userId}`).pipe(
      map(mapInvestorProfileDto)
    );
  }

  create(body: CreateInvestorProfileRequestDto): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(body: UpdateInvestorProfileRequestDto): Observable<void> {
    return this.http.put<void>(this.base, body);
  }
}
