import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BYPASS_403 } from '../../core/http/error.interceptor';
import { StartupScore, SuggestedTerms } from '../../shared/models/startup-score.model';
import {
  StartupScoreDto, SuggestedTermsDto,
  mapStartupScoreDto, mapSuggestedTermsDto,
} from '../../shared/models/dto/startup-score.dto';

@Injectable({ providedIn: 'root' })
export class StartupScoreService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // Score & suggested terms are Pro-gated → a non-Pro user gets 403, which the scoring tab
  // surfaces inline. Opt out of the global /403 redirect so browsing a startup isn't hijacked.
  getScore(startupId: string): Observable<StartupScore> {
    return this.http.get<StartupScoreDto>(`${this.base}/startups/${startupId}/score`, {
      context: new HttpContext().set(BYPASS_403, true),
    }).pipe(
      map(mapStartupScoreDto)
    );
  }

  getSuggestedTerms(startupId: string, instrument: number, amount: number): Observable<SuggestedTerms> {
    return this.http.get<SuggestedTermsDto>(`${this.base}/startups/${startupId}/suggested-terms`, {
      params: { instrument: instrument.toString(), amount: amount.toString() },
      context: new HttpContext().set(BYPASS_403, true),
    }).pipe(
      map(mapSuggestedTermsDto)
    );
  }
}
