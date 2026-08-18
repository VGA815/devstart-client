import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupPatents, StartupPatentSuggestions } from '../../shared/models/startup-patent.model';
import {
  CreateStartupPatentRequestDto,
  StartupPatentsDto,
  StartupPatentSuggestionsDto,
  mapStartupPatentsDto,
  mapStartupPatentSuggestionsDto,
} from '../../shared/models/dto/startup-patent.dto';

@Injectable({ providedIn: 'root' })
export class StartupPatentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  /** Записи вместе с их сверкой: состояние считается на чтении, отдельного статуса нет. */
  getByStartupId(startupId: string): Observable<StartupPatents> {
    return this.http.get<StartupPatentsDto>(`${this.base}/startups/${startupId}/patents`).pipe(
      map(mapStartupPatentsDto)
    );
  }

  create(body: CreateStartupPatentRequestDto): Observable<string> {
    return this.http.post<string>(`${this.base}/startup-patents`, body);
  }

  delete(patentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/startup-patents/${patentId}`);
  }

  /** Обратный поиск по заявленному ИНН — только для участников стартапа. */
  getSuggestions(startupId: string): Observable<StartupPatentSuggestions> {
    return this.http
      .get<StartupPatentSuggestionsDto>(`${this.base}/startups/${startupId}/patents/suggestions`)
      .pipe(map(mapStartupPatentSuggestionsDto));
  }
}
