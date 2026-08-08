import {
  ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, Output,
  SimpleChanges, ViewChild, computed, inject, signal,
} from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/auth.service';
import { StartupService } from '../../../startups/startup.service';
import { StartupMetricsService } from '../../../startups/startup-metrics.service';
import { StartupDocumentsService } from '../../../startups/startup-documents.service';
import { MessageService } from '../message.service';
import { ChatFileService } from '../chat-file.service';
import { ChatAttachmentsService } from '../chat-attachments.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import {
  ChatParticipant, ConversationSummary, Message,
} from '../../../../shared/models/message.model';
import { StartupMetric } from '../../../../shared/models/startup-metric.model';
import { StartupDocument } from '../../../../shared/models/startup-document.model';
import {
  CHAT_FILE_ACCEPT, CHAT_FILE_MAX_SIZE_BYTES, getChatFileIcon, isImageFile,
} from '../../../../shared/models/chat-file.model';
import {
  formatFileSize, formatMetricValue, getDocumentIcon, getDocumentTypeLabel, getMetricLabel,
} from '../../../../shared/utils/startup.utils';

type PickerData = { metrics: StartupMetric[]; nameMap: Map<string, string> };

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './chat-composer.component.html',
  styleUrl: './chat-composer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposerComponent implements OnChanges {
  @Input({ required: true }) conversation!: ConversationSummary;
  /** Стартап, от лица которого отправляется сообщение; undefined — пишем от себя. */
  @Input() senderStartupId?: string;

  @Output() sent = new EventEmitter<Message>();

  private readonly auth = inject(AuthService);
  private readonly messageSvc = inject(MessageService);
  private readonly filesSvc = inject(ChatFileService);
  private readonly startupSvc = inject(StartupService);
  private readonly metricsSvc = inject(StartupMetricsService);
  private readonly docsSvc = inject(StartupDocumentsService);
  protected readonly attachments = inject(ChatAttachmentsService);

  @ViewChild('fileInputEl') private fileInputEl?: ElementRef<HTMLInputElement>;

  readonly text = signal('');
  readonly sending = signal(false);
  readonly errorSend = signal(false);
  readonly metricIds = signal<string[]>([]);
  readonly documentIds = signal<string[]>([]);
  readonly fileIds = signal<string[]>([]);
  readonly uploadingFile = signal(false);
  readonly uploadError = signal<string | null>(null);

  readonly showMetricPicker = signal(false);
  readonly showDocPicker = signal(false);
  readonly pickerMetrics = signal<StartupMetric[]>([]);
  readonly pickerStartupNames = signal<Map<string, string>>(new Map());
  readonly pickerDocuments = signal<StartupDocument[]>([]);
  readonly pickerLoading = signal(false);
  readonly pickerDocLoading = signal(false);

  private pickerLoaded = false;
  private pickerDocLoaded = false;

  protected readonly fileAccept = CHAT_FILE_ACCEPT;

  readonly cannotSend = computed(() =>
    (!this.text().trim() &&
      this.metricIds().length === 0 &&
      this.documentIds().length === 0 &&
      this.fileIds().length === 0) ||
    this.sending() ||
    this.uploadingFile()
  );

  protected readonly metricLabel = getMetricLabel;
  protected readonly metricValue = formatMetricValue;
  protected readonly docLabel = getDocumentTypeLabel;
  protected readonly docIcon = getDocumentIcon;
  protected readonly fileSize = formatFileSize;
  protected readonly fileIcon = getChatFileIcon;
  protected readonly isImage = isImageFile;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversation'] && !changes['conversation'].firstChange) {
      this.showMetricPicker.set(false);
      this.showDocPicker.set(false);
    }
  }


  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!this.cannotSend()) this.send();
    }
  }

  send(): void {
    const text = this.text().trim();
    const metricIds = this.metricIds();
    const documentIds = this.documentIds();
    const fileIds = this.fileIds();

    if (!text && metricIds.length === 0 && documentIds.length === 0 && fileIds.length === 0) return;
    if (this.sending()) return;

    const user = this.auth.user();
    if (!user) return;

    const conv = this.conversation;
    this.sending.set(true);
    this.errorSend.set(false);

    const senderStartupId = this.senderStartupId;

    this.messageSvc.send({
      receiverId:   conv.otherParticipantId,
      receiverType: conv.otherParticipantType,
      senderStartupId,
      textContent:  text || undefined,
      metricIds:    metricIds.length   ? metricIds   : undefined,
      documentIds:  documentIds.length ? documentIds : undefined,
      fileIds:      fileIds.length     ? fileIds     : undefined,
    }).subscribe({
      next: id => {
        const now = new Date().toISOString();
        const msg: Message = {
          id, textContent: text || null,
          senderId: senderStartupId ?? user.id,
          senderType: senderStartupId ? ChatParticipant.Startup : ChatParticipant.User,
          sentByProfileId: senderStartupId ? user.id : null,
          receiverId: conv.otherParticipantId, receiverType: conv.otherParticipantType,
          mediaIds: [], metricIds: [...metricIds],
          documentIds: [...documentIds], fileIds: [...fileIds],
          isRead: false, createdAt: now, updatedAt: now,
        };
        this.resetDraft();
        this.sending.set(false);
        this.sent.emit(msg);
      },
      error: () => {
        this.sending.set(false);
        this.errorSend.set(true);
      },
    });
  }

  private resetDraft(): void {
    this.text.set('');
    this.metricIds.set([]);
    this.documentIds.set([]);
    this.fileIds.set([]);
    this.uploadError.set(null);
  }

  triggerFileInput(): void {
    this.fileInputEl?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    this.uploadError.set(null);

    const rejection = this.filesSvc.validate(file);
    if (rejection === 'size') {
      this.uploadError.set(`Файл больше ${formatFileSize(CHAT_FILE_MAX_SIZE_BYTES)}`);
      return;
    }
    if (rejection === 'type') {
      this.uploadError.set('Такой тип файла нельзя отправить');
      return;
    }

    this.uploadingFile.set(true);
    this.filesSvc.upload(file).pipe(
      catchError(() => of(null)),
    ).subscribe(uploaded => {
      this.uploadingFile.set(false);
      if (!uploaded) {
        this.uploadError.set('Не удалось загрузить файл');
        return;
      }

      this.attachments.cacheFile(uploaded);
      this.fileIds.update(ids => [...ids, uploaded.id]);
    });
  }

  removeAttachedFile(id: string): void {
    this.fileIds.update(ids => ids.filter(x => x !== id));
  }


  toggleMetricPicker(): void {
    this.showDocPicker.set(false);
    this.showMetricPicker.update(v => !v);
    if (!this.pickerLoaded) this.loadPickerMetrics();
  }

  private loadPickerMetrics(): void {
    const user = this.auth.user();
    if (!user) return;
    this.pickerLoading.set(true);

    this.startupSvc.getStartupsByProfile(user.id).pipe(
      catchError(() => of([])),
      switchMap(startups => {
        if (startups.length === 0) {
          return of<PickerData>({ metrics: [], nameMap: new Map() });
        }
        const nameMap = new Map(startups.map(s => [s.id, s.name] as [string, string]));
        return forkJoin(
          startups.map(s => this.metricsSvc.getMetrics(s.id).pipe(catchError(() => of<StartupMetric[]>([]))))
        ).pipe(
          map(groups => ({ metrics: groups.flat(), nameMap }) satisfies PickerData)
        );
      }),
    ).subscribe(({ metrics, nameMap }) => {
      this.pickerMetrics.set(metrics);
      this.pickerStartupNames.set(nameMap);
      this.pickerLoading.set(false);
      this.pickerLoaded = true;
    });
  }

  isMetricAttached(id: string): boolean {
    return this.metricIds().includes(id);
  }

  toggleMetric(metric: StartupMetric): void {
    if (this.isMetricAttached(metric.id)) {
      this.metricIds.update(ids => ids.filter(x => x !== metric.id));
    } else {
      this.metricIds.update(ids => [...ids, metric.id]);
      this.attachments.cacheMetric(metric);
    }
  }

  removeAttachedMetric(id: string): void {
    this.metricIds.update(ids => ids.filter(x => x !== id));
  }


  toggleDocPicker(): void {
    this.showMetricPicker.set(false);
    this.showDocPicker.update(v => !v);
    if (!this.pickerDocLoaded) this.loadPickerDocuments();
  }

  private loadPickerDocuments(): void {
    const user = this.auth.user();
    if (!user) return;
    this.pickerDocLoading.set(true);

    this.docsSvc.getDocumentsByUploader(user.id).pipe(
      catchError(() => of<StartupDocument[]>([])),
    ).subscribe(docs => {
      this.pickerDocuments.set(docs);
      this.pickerDocLoading.set(false);
      this.pickerDocLoaded = true;
    });
  }

  isDocumentAttached(id: string): boolean {
    return this.documentIds().includes(id);
  }

  toggleDocument(doc: StartupDocument): void {
    if (this.isDocumentAttached(doc.id)) {
      this.documentIds.update(ids => ids.filter(x => x !== doc.id));
    } else {
      this.documentIds.update(ids => [...ids, doc.id]);
      this.attachments.cacheDocument(doc);
    }
  }

  removeAttachedDocument(id: string): void {
    this.documentIds.update(ids => ids.filter(x => x !== id));
  }


  pickerStartupName(startupId: string): string {
    return this.pickerStartupNames().get(startupId) ?? '';
  }
}
