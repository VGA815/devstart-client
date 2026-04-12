import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Application } from '../../../shared/models/application.model';
import { ApplicationDto, mapApplicationDto } from '../../../shared/models/dto/application.dto';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/applications`;

  getIncoming(profileId: string): Observable<Application[]> {
    const params = new HttpParams().set('profileId', profileId);
    return this.http.get<ApplicationDto[]>(this.base, { params }).pipe(
      map(list => list.map(mapApplicationDto))
    );
  }

  accept(applicationId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${applicationId}/accept`, {});
  }

  reject(applicationId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${applicationId}/reject`, {});
  }
}
