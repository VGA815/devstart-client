import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile } from '../../shared/models/profile.model';
import {
  ProfileDto,
  CreateProfileRequestDto,
  UpdateProfileRequestDto,
  mapProfileDto,
} from '../../shared/models/dto/profile.dto';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/profiles`;

  getProfile(profileId: string): Observable<Profile> {
    return this.http.get<ProfileDto>(`${this.base}/${profileId}`).pipe(
      map(mapProfileDto)
    );
  }

  createProfile(body: CreateProfileRequestDto): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  updateProfile(body: UpdateProfileRequestDto): Observable<void> {
    return this.http.put<void>(this.base, body);
  }

  deleteProfile(profileId: string): Observable<void> {
    return this.http.delete<void>(this.base, {
      params: { profileId },
    });
  }
}
