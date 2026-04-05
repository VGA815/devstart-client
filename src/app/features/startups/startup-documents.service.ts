import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StartupDocument } from '../../shared/models/startup-document.model';
import { StartupDocumentDto, mapStartupDocumentDto } from '../../shared/models/dto/startup-document.dto';

@Injectable({ providedIn: 'root' })
export class StartupDocumentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/startups`;
  private readonly usersBase = `${environment.apiUrl}/users`;

  getDocuments(startupId: string): Observable<StartupDocument[]> {
    return this.http
      .get<StartupDocumentDto[]>(`${this.base}/${startupId}/documents`)
      .pipe(map(list => list.map(mapStartupDocumentDto)));
  }

  uploadDocument(params: {
    startupId: string;
    file: File;
    documentName: string;
    documentType: number; // 0=Pitch, 1=Report, 2=Other
  }): Observable<string> {
    const query = new HttpParams()
      .set('startupId', params.startupId)
      .set('documentName', params.documentName)
      .set('documentType', params.documentType.toString());

    const formData = new FormData();
    formData.append('file', params.file);

    return this.http.post<string>(`${this.base}/documents`, formData, { params: query });
  }

  getDocumentById(documentId: string): Observable<StartupDocument> {
    return this.http
      .get<StartupDocumentDto>(`${this.base}/documents/${documentId}`)
      .pipe(map(mapStartupDocumentDto));
  }

  getDocumentsByUploader(uploaderId: string): Observable<StartupDocument[]> {
    return this.http
      .get<StartupDocumentDto[]>(`${this.usersBase}/${uploaderId}/documents`)
      .pipe(map(list => list.map(mapStartupDocumentDto)));
  }

  deleteDocument(documentId: string): Observable<void> {
    const params = new HttpParams().set('documentId', documentId);
    return this.http.delete<void>(`${this.base}/documents`, { params });
  }
}
