import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupMember } from '../../shared/models/startup.model';
import { StartupMemberDto, mapStartupMemberDto, UpdateStartupMemberProfileRequestDto } from '../../shared/models/dto/startup.dto';

@Injectable({ providedIn: 'root' })
export class StartupMembersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups`;

  getMembers(startupId: string): Observable<StartupMember[]> {
    return this.http.get<StartupMemberDto[]>(`${this.base}/${startupId}/members`).pipe(
      map(list => list.map(mapStartupMemberDto))
    );
  }

  addMember(body: { profile_id: string; startup_id: string; role: number; is_public: boolean }): Observable<string> {
    return this.http.post<string>(`${this.base}/members`, body);
  }

  updateRole(body: { startup_id: string; profile_id: string; role: number }): Observable<void> {
    return this.http.put<void>(`${this.base}/members/role`, body);
  }

  removeMember(startupId: string, profileId: string): Observable<void> {
    const params = new HttpParams()
      .set('startupId', startupId)
      .set('profileId', profileId);
    return this.http.delete<void>(`${this.base}/members`, { params });
  }

  updateMemberProfile(body: UpdateStartupMemberProfileRequestDto): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/startup-members/profile`, body);
  }
}
