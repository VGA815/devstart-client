import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvestmentApplication } from '../../shared/models/investment-application.model';
import {
  InvestmentApplicationDto, mapInvestmentApplicationDto,
  CreateInvestmentApplicationRequestDto,
} from '../../shared/models/dto/investment-application.dto';

@Injectable({ providedIn: 'root' })
export class InvestmentApplicationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  create(body: CreateInvestmentApplicationRequestDto): Observable<string> {
    return this.http.post<string>(`${this.base}/investment-applications`, body);
  }

  accept(applicationId: string): Observable<string> {
    return this.http.post<string>(`${this.base}/investment-applications/${applicationId}/accept`, {});
  }

  reject(applicationId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/investment-applications/${applicationId}/reject`, {});
  }

  withdraw(applicationId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/investment-applications/${applicationId}/withdraw`, {});
  }

  getById(applicationId: string): Observable<InvestmentApplication> {
    return this.http.get<InvestmentApplicationDto>(`${this.base}/investment-applications/${applicationId}`).pipe(
      map(mapInvestmentApplicationDto)
    );
  }

  getByStartup(startupId: string): Observable<InvestmentApplication[]> {
    return this.http.get<InvestmentApplicationDto[]>(`${this.base}/startups/${startupId}/investment-applications`).pipe(
      map(list => list.map(mapInvestmentApplicationDto))
    );
  }

  getByInvestor(userId: string): Observable<InvestmentApplication[]> {
    return this.http.get<InvestmentApplicationDto[]>(`${this.base}/investor-profiles/${userId}/investment-applications`).pipe(
      map(list => list.map(mapInvestmentApplicationDto))
    );
  }
}
