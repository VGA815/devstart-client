import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ChatFile, CHAT_FILE_ALLOWED_TYPES, CHAT_FILE_MAX_SIZE_BYTES } from '../../../shared/models/chat-file.model';
import { ChatFileDto, mapChatFileDto } from '../../../shared/models/dto/chat-file.dto';

export type ChatFileRejection = 'type' | 'size';

@Injectable({ providedIn: 'root' })
export class ChatFileService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/chat/files`;

  /** Client-side pre-check so the user gets an instant answer; the server enforces the same rules. */
  validate(file: File): ChatFileRejection | null {
    if (file.size > CHAT_FILE_MAX_SIZE_BYTES) return 'size';
    if (!CHAT_FILE_ALLOWED_TYPES.includes(file.type)) return 'type';
    return null;
  }

  upload(file: File): Observable<ChatFile> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ChatFileDto>(this.base, form).pipe(map(mapChatFileDto));
  }

  getById(fileId: string): Observable<ChatFile> {
    return this.http.get<ChatFileDto>(`${this.base}/${fileId}`).pipe(map(mapChatFileDto));
  }
}
