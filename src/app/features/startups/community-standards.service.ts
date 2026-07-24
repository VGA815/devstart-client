import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BYPASS_403 } from '../../core/http/error.interceptor';
import {
  CommunityDocument, CommunityDocumentSummary, CommunityDocumentTemplate, CommunityDocumentType,
  CommunityStandards,
} from '../../shared/models/community-standards.model';
import {
  COMMUNITY_DOC_TYPE_NUM,
  CommunityDocumentDto, CommunityDocumentSummaryDto, CommunityDocumentTemplateDto,
  CommunityStandardsDto, UpsertCommunityDocumentRequestDto,
  mapCommunityDocumentDto, mapCommunityDocumentSummaryDto, mapCommunityDocumentTemplateDto,
  mapCommunityStandardsDto,
} from '../../shared/models/dto/community-standards.dto';

@Injectable({ providedIn: 'root' })
export class CommunityStandardsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  /** Живой пересчёт чек-листа. Читается анонимно — это публичный сигнал доверия. */
  getStandards(startupId: string): Observable<CommunityStandards> {
    return this.http.get<CommunityStandardsDto>(`${this.base}/startups/${startupId}/community`).pipe(
      map(mapCommunityStandardsDto)
    );
  }

  /** Только метаданные — markdown-тело отдаётся отдельным запросом. */
  getDocuments(startupId: string): Observable<CommunityDocumentSummary[]> {
    return this.http.get<CommunityDocumentSummaryDto[]>(
      `${this.base}/startups/${startupId}/community/documents`
    ).pipe(
      map(list => list.map(mapCommunityDocumentSummaryDto))
    );
  }

  getDocument(startupId: string, type: CommunityDocumentType): Observable<CommunityDocument> {
    return this.http.get<CommunityDocumentDto>(
      `${this.base}/startups/${startupId}/community/documents/${COMMUNITY_DOC_TYPE_NUM[type]}`
    ).pipe(
      map(mapCommunityDocumentDto)
    );
  }

  /**
   * Запись разрешена только основателям и администраторам стартапа — остальным бэк отвечает 403.
   * Отключаем глобальный редирект на /403: ошибку показываем инлайн в карточке дашборда.
   */
  upsertDocument(
    startupId: string,
    type: CommunityDocumentType,
    body: UpsertCommunityDocumentRequestDto,
  ): Observable<string> {
    return this.http.put<string>(
      `${this.base}/startups/${startupId}/community/documents/${COMMUNITY_DOC_TYPE_NUM[type]}`,
      body,
      { context: new HttpContext().set(BYPASS_403, true) },
    );
  }

  /** Черновиков нет: удаление документа — это способ снять его с публикации. */
  deleteDocument(startupId: string, type: CommunityDocumentType): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/startups/${startupId}/community/documents/${COMMUNITY_DOC_TYPE_NUM[type]}`,
      { context: new HttpContext().set(BYPASS_403, true) },
    );
  }

  getTemplates(): Observable<CommunityDocumentTemplate[]> {
    return this.http.get<CommunityDocumentTemplateDto[]>(`${this.base}/community-standards/templates`, {
      context: new HttpContext().set(BYPASS_403, true),
    }).pipe(
      map(list => list.map(mapCommunityDocumentTemplateDto))
    );
  }
}
