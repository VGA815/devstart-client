import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExpertExperience } from '../../shared/models/expert-experience.model';
import {
  ExpertExperienceDto, mapExpertExperienceDto,
  CreateExpertExperienceRequestDto, UpdateExpertExperienceRequestDto,
} from '../../shared/models/dto/expert-experience.dto';

@Injectable({ providedIn: 'root' })
export class ExpertExperienceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/expert-experiences`;
  private readonly profilesBase = `${environment.apiUrl}/expert-profiles`;

  getByExpertProfileId(expertProfileId: string): Observable<ExpertExperience[]> {
    return this.http.get<ExpertExperienceDto[]>(
      `${this.profilesBase}/${expertProfileId}/experiences`
    ).pipe(map(list => list.map(mapExpertExperienceDto)));
  }

  create(body: CreateExpertExperienceRequestDto): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  update(body: UpdateExpertExperienceRequestDto): Observable<void> {
    return this.http.put<void>(this.base, body);
  }

  delete(id: string): Observable<void> {
    const params = new HttpParams().set('id', id);
    return this.http.delete<void>(this.base, { params });
  }
}
