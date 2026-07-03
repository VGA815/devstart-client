import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// GET api/users/{userId}/overview — privacy-aware aggregate of a user's public face:
// profile + investor/expert profiles (null when absent) + statistics.
// Owner-only fields (email, totalInvestedAmount) come back null for other viewers.
export interface UserOverviewStatisticsDto {
  isInvestor: boolean;
  isExpert: boolean;
  completedDealsCount: number;
  totalInvestedAmount: number | null;
  acceptedCollaborationsCount: number;
  experiencesCount: number;
}

export interface UserOverviewDto {
  id: string;
  username: string;
  email: string | null;
  profile: unknown | null;
  investorProfile: { displayName: string } | null;
  expertProfile: { displayName: string } | null;
  statistics: UserOverviewStatisticsDto;
}

@Injectable({ providedIn: 'root' })
export class UserOverviewService {
  private readonly http = inject(HttpClient);

  get(userId: string): Observable<UserOverviewDto> {
    return this.http.get<UserOverviewDto>(`${environment.apiUrl}/users/${userId}/overview`);
  }
}
