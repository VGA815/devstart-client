import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { InvestmentDeal } from '../../shared/models/investment-deal.model';
import {
  InvestmentDealDto,
  CapTableResultDto,
  TermSheetResponseDto,
  mapInvestmentDealDto,
} from '../../shared/models/dto/investment-deal.dto';

@Injectable({ providedIn: 'root' })
export class InvestmentDealService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  confirmByStartup(dealId: string): Observable<unknown> {
    return this.http.post<void>(`${this.base}/investment-deals/${dealId}/confirm-startup`, {});
  }

  confirmByInvestor(dealId: string): Observable<unknown> {
    return this.http.post<void>(`${this.base}/investment-deals/${dealId}/confirm-investor`, {});
  }

  regenerateDocuments(dealId: string): Observable<unknown> {
    return this.http.post<void>(`${this.base}/investment-deals/${dealId}/regenerate-documents`, {});
  }

  getById(dealId: string): Observable<InvestmentDeal> {
    return this.http.get<InvestmentDealDto>(`${this.base}/investment-deals/${dealId}`).pipe(
      switchMap(dto => {
        if (!dto.documentsReady) {
          return of(mapInvestmentDealDto(dto));
        }
        return forkJoin({
          termSheet: this.http
            .get<TermSheetResponseDto>(`${this.base}/investment-deals/${dealId}/term-sheet`)
            .pipe(
              catchError(() => of(null)),
              map(r => r?.markdown ?? null),
            ),
          capTable: this.http
            .get<CapTableResultDto>(`${this.base}/investment-deals/${dealId}/cap-table`)
            .pipe(
              catchError(() => of(null)),
              map(r => r?.entries ?? []),
            ),
        }).pipe(
          map(({ termSheet, capTable }) =>
            mapInvestmentDealDto(dto, termSheet, capTable),
          ),
        );
      }),
    );
  }

  getByStartup(startupId: string): Observable<InvestmentDeal[]> {
    return this.http
      .get<InvestmentDealDto[]>(`${this.base}/startups/${startupId}/investment-deals`)
      .pipe(map(list => list.map(dto => mapInvestmentDealDto(dto))));
  }

  getByInvestor(userId: string): Observable<InvestmentDeal[]> {
    return this.http
      .get<InvestmentDealDto[]>(`${this.base}/investor-profiles/${userId}/investment-deals`)
      .pipe(map(list => list.map(dto => mapInvestmentDealDto(dto))));
  }
}
