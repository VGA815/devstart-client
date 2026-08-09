import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ExpertCollaborationRequest, CollaborationRequestStatus,
} from '../../shared/models/expert-collaboration-request.model';
import {
  ExpertCollaborationRequestDto, mapExpertCollaborationRequestDto,
  CreateExpertCollaborationRequestDto, STATUS_NUM,
} from '../../shared/models/dto/expert-collaboration-request.dto';

export interface CollabRequestPage {
  status?: CollaborationRequestStatus;
  pageNumber?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class ExpertCollaborationRequestService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/expert-collaboration-requests`;
  private readonly api  = environment.apiUrl;

  create(body: CreateExpertCollaborationRequestDto): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  getById(requestId: string): Observable<ExpertCollaborationRequest> {
    return this.http.get<ExpertCollaborationRequestDto>(`${this.base}/${requestId}`).pipe(
      map(mapExpertCollaborationRequestDto)
    );
  }

  getByExpertProfile(expertProfileId: string, page: CollabRequestPage = {}): Observable<ExpertCollaborationRequest[]> {
    return this.http.get<ExpertCollaborationRequestDto[]>(
      `${this.api}/expert-profiles/${expertProfileId}/expert-collaboration-requests`,
      { params: toParams(page) },
    ).pipe(map(list => list.map(mapExpertCollaborationRequestDto)));
  }

  getByStartup(startupId: string, page: CollabRequestPage = {}): Observable<ExpertCollaborationRequest[]> {
    return this.http.get<ExpertCollaborationRequestDto[]>(
      `${this.api}/startups/${startupId}/expert-collaboration-requests`,
      { params: toParams(page) },
    ).pipe(map(list => list.map(mapExpertCollaborationRequestDto)));
  }

  accept(requestId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${requestId}/accept`, {});
  }

  reject(requestId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${requestId}/reject`, {});
  }

  withdraw(requestId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${requestId}/withdraw`, {});
  }
}

function toParams({ status, pageNumber, pageSize }: CollabRequestPage): HttpParams {
  let params = new HttpParams();
  if (status)     params = params.set('status', STATUS_NUM[status]);
  if (pageNumber) params = params.set('pageNumber', pageNumber);
  if (pageSize)   params = params.set('pageSize', pageSize);
  return params;
}
