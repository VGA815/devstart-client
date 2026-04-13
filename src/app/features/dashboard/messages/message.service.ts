import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Message, ConversationSummary, ChatParticipantType } from '../../../shared/models/message.model';
import {
  MessageDto, ConversationSummaryDto, SendMessageRequestDto,
  mapMessageDto, mapConversationDto,
} from '../../../shared/models/dto/message.dto';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/messages`;

  getConversations(page = 1, pageSize = 50): Observable<ConversationSummary[]> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<ConversationSummaryDto[]>(`${this.base}/conversations`, { params }).pipe(
      map(list => list.map(mapConversationDto))
    );
  }

  getConversation(
    otherType: ChatParticipantType,
    otherId: string,
    page = 1,
    pageSize = 50,
  ): Observable<Message[]> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<MessageDto[]>(
      `${this.base}/conversations/${otherType}/${otherId}`,
      { params },
    ).pipe(map(list => list.map(mapMessageDto)));
  }

  getById(messageId: string): Observable<Message> {
    return this.http.get<MessageDto>(`${this.base}/${messageId}`).pipe(
      map(mapMessageDto)
    );
  }

  send(body: SendMessageRequestDto): Observable<string> {
    return this.http.post<string>(this.base, body);
  }

  markRead(messageId: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${messageId}/read`, {});
  }
}
