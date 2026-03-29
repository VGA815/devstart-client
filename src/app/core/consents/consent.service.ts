import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConsentDocumentDto, ConsentVersionsDto, UserConsentDto } from '../../shared/models/dto/consent.dto';

@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/consents`;

  getVersions(): Observable<ConsentVersionsDto> {
    return this.http.get<ConsentVersionsDto>(`${this.base}/versions`);
  }

  getUserConsents(): Observable<UserConsentDto[]> {
    return this.http.get<UserConsentDto[]>(this.base);
  }

  revokeConsent(type: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${type}`);
  }

  getDocuments(): Observable<ConsentDocumentDto[]> {
    return this.http.get<ConsentDocumentDto[]>(`${environment.apiUrl}/consent-documents`);
  }

  getDocument(type: number): Observable<ConsentDocumentDto> {
    return this.http.get<ConsentDocumentDto>(`${environment.apiUrl}/consent-documents/${type}`);
  }
}
