import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupScore, SuggestedTerms } from '../../shared/models/startup-score.model';
import {
  StartupScoreDto, SuggestedTermsDto,
  mapStartupScoreDto, mapSuggestedTermsDto,
} from '../../shared/models/dto/startup-score.dto';

@Injectable({ providedIn: 'root' })
export class StartupScoreService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  getScore(startupId: string): Observable<StartupScore> {
    return this.http.get<StartupScoreDto>(`${this.base}/startups/${startupId}/score`).pipe(
      map(mapStartupScoreDto)
    );
  }

  getSuggestedTerms(startupId: string, instrument: number, amount: number): Observable<SuggestedTerms> {
    return this.http.get<SuggestedTermsDto>(`${this.base}/startups/${startupId}/suggested-terms`, {
      params: { instrument: instrument.toString(), amount: amount.toString() },
    }).pipe(
      map(mapSuggestedTermsDto)
    );
  }
}
