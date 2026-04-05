import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupFollower } from '../../shared/models/startup-follower.model';
import { Startup } from '../../shared/models/startup.model';
import { StartupDto, mapStartupDto } from '../../shared/models/dto/startup.dto';

@Injectable({ providedIn: 'root' })
export class StartupFollowersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups/followers`;

  follow(startupId: string, profileId: string): Observable<void> {
    return this.http.post<void>(this.base, {
      startup_id: startupId,
      profile_id: profileId,
    });
  }

  unfollow(startupId: string): Observable<void> {
    const params = new HttpParams().set('startupId', startupId);
    return this.http.delete<void>(this.base, { params });
  }

  getFollowers(startupId: string, page = 1, pageSize = 100): Observable<StartupFollower[]> {
    const params = new HttpParams()
      .set('startupId', startupId)
      .set('page', page)
      .set('pageSize', pageSize);
    return this.http.get<StartupFollower[]>(this.base, { params });
  }

  getFollowedStartups(profileId: string): Observable<Startup[]> {
    const params = new HttpParams().set('profileId', profileId);
    return this.http.get<StartupDto[]>(`${this.base}/by-profile`, { params }).pipe(
      map(list => list.map(mapStartupDto))
    );
  }
}
