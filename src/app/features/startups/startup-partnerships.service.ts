import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupPartnership } from '../../shared/models/startup-partnership.model';
import {
  StartupPartnershipDto,
  CreateStartupPartnershipRequestDto,
  UpdateStartupPartnershipRequestDto,
  mapStartupPartnershipDto,
} from '../../shared/models/dto/startup-partnership.dto';

@Injectable({ providedIn: 'root' })
export class StartupPartnershipsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  getByStartupId(startupId: string): Observable<StartupPartnership[]> {
    return this.http.get<StartupPartnershipDto[]>(`${this.base}/startups/${startupId}/partnerships`).pipe(
      map(list => list.map(mapStartupPartnershipDto))
    );
  }

  create(body: CreateStartupPartnershipRequestDto): Observable<string> {
    return this.http.post<string>(`${this.base}/startup-partnerships`, body);
  }

  update(partnershipId: string, body: UpdateStartupPartnershipRequestDto): Observable<void> {
    return this.http.put<void>(`${this.base}/startup-partnerships/${partnershipId}`, body);
  }

  delete(partnershipId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/startup-partnerships/${partnershipId}`);
  }
}
