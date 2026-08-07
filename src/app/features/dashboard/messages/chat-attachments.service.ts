import { DestroyRef, Injectable, WritableSignal, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ImageService } from '../../../shared/services/image.service';
import { StartupMetricsService } from '../../startups/startup-metrics.service';
import { StartupDocumentsService } from '../../startups/startup-documents.service';
import { ChatFileService } from './chat-file.service';
import { Message } from '../../../shared/models/message.model';
import { StartupMetric } from '../../../shared/models/startup-metric.model';
import { StartupDocument } from '../../../shared/models/startup-document.model';
import { ChatFile } from '../../../shared/models/chat-file.model';

/**
 * Presigned URLs on documents and chat files are minted for 1 hour by the API, so a cached entry
 * must not outlive them: refresh at 50 minutes (plus jitter, to spread the refetch of a long thread).
 */
const URL_TTL_BASE_MS = 3_000_000;
const URL_TTL_JITTER_MS = 120_000;

/** Sweep interval for threads left open longer than the URL lifetime. */
const REFRESH_SWEEP_MS = 600_000;

interface Cached<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class ChatAttachmentsService {
  private readonly imageSvc = inject(ImageService);
  private readonly metricsSvc = inject(StartupMetricsService);
  private readonly docsSvc = inject(StartupDocumentsService);
  private readonly filesSvc = inject(ChatFileService);

  private readonly _mediaUrls = signal<Map<string, string>>(new Map());
  private readonly _metrics = signal<Map<string, StartupMetric>>(new Map());
  private readonly _documents = signal<Map<string, Cached<StartupDocument>>>(new Map());
  private readonly _files = signal<Map<string, Cached<ChatFile>>>(new Map());

  /** Ids seen in the current thread, so the sweep knows what to keep alive. */
  private readonly seenDocumentIds = new Set<string>();
  private readonly seenFileIds = new Set<string>();

  /** Guards against firing the same request twice while one is still in flight. */
  private readonly inflightDocuments = new Set<string>();
  private readonly inflightFiles = new Set<string>();

  constructor() {
    const timer = setInterval(() => this.refreshExpiring(), REFRESH_SWEEP_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  mediaUrl(id: string): string | null {
    return this._mediaUrls().get(id) ?? null;
  }

  metric(id: string): StartupMetric | null {
    return this._metrics().get(id) ?? null;
  }

  document(id: string): StartupDocument | null {
    return this._documents().get(id)?.value ?? null;
  }

  file(id: string): ChatFile | null {
    return this._files().get(id)?.value ?? null;
  }

  cacheMedia(id: string, url: string): void {
    this.setIn(this._mediaUrls, id, url);
  }

  cacheMetric(metric: StartupMetric): void {
    this.setIn(this._metrics, metric.id, metric);
  }

  cacheDocument(doc: StartupDocument): void {
    this.seenDocumentIds.add(doc.id);
    this.setIn(this._documents, doc.id, { value: doc, expiresAt: this.nextExpiry() });
  }

  cacheFile(file: ChatFile): void {
    this.seenFileIds.add(file.id);
    this.setIn(this._files, file.id, { value: file, expiresAt: this.nextExpiry() });
  }

  resolve(messages: Message[]): void {
    for (const id of this.missing(messages.flatMap(m => m.mediaIds), this._mediaUrls())) {
      this.imageSvc.getPresignedUrl(id).pipe(catchError(() => of(null))).subscribe(url => {
        if (url) this.cacheMedia(id, url);
      });
    }
    for (const id of this.missing(messages.flatMap(m => m.metricIds), this._metrics())) {
      this.metricsSvc.getMetricById(id).pipe(catchError(() => of(null))).subscribe(metric => {
        if (metric) this.cacheMetric(metric);
      });
    }
    for (const id of this.stale(messages.flatMap(m => m.documentIds), this._documents())) {
      this.seenDocumentIds.add(id);
      this.fetchDocument(id);
    }
    for (const id of this.stale(messages.flatMap(m => m.fileIds), this._files())) {
      this.seenFileIds.add(id);
      this.fetchFile(id);
    }
  }

  refetchMedia(id: string): void {
    this.imageSvc.invalidate(id);
    this.deleteIn(this._mediaUrls, id);
    this.imageSvc.getPresignedUrl(id).pipe(catchError(() => of(null))).subscribe(url => {
      if (url) this.cacheMedia(id, url);
    });
  }

  /** Re-fetches an image whose presigned URL expired while the thread stayed open. */
  refetchFile(id: string): void {
    this.fetchFile(id);
  }

  private fetchDocument(id: string): void {
    if (this.inflightDocuments.has(id)) return;
    this.inflightDocuments.add(id);

    this.docsSvc.getDocumentById(id).pipe(catchError(() => of(null))).subscribe(doc => {
      this.inflightDocuments.delete(id);
      if (doc) this.cacheDocument(doc);
    });
  }

  private fetchFile(id: string): void {
    if (this.inflightFiles.has(id)) return;
    this.inflightFiles.add(id);

    this.filesSvc.getById(id).pipe(catchError(() => of(null))).subscribe(file => {
      this.inflightFiles.delete(id);
      if (file) this.cacheFile(file);
    });
  }

  private refreshExpiring(): void {
    const now = Date.now();
    for (const id of this.seenDocumentIds) {
      const entry = this._documents().get(id);
      if (!entry || entry.expiresAt <= now) this.fetchDocument(id);
    }
    for (const id of this.seenFileIds) {
      const entry = this._files().get(id);
      if (!entry || entry.expiresAt <= now) this.fetchFile(id);
    }
  }

  private nextExpiry(): number {
    return Date.now() + URL_TTL_BASE_MS + Math.random() * URL_TTL_JITTER_MS;
  }

  private missing(ids: string[], cache: Map<string, unknown>): string[] {
    return [...new Set(ids.filter(id => !cache.has(id)))];
  }

  private stale<T>(ids: string[], cache: Map<string, Cached<T>>): string[] {
    const now = Date.now();
    return [...new Set(ids.filter(id => {
      const entry = cache.get(id);
      return !entry || entry.expiresAt <= now;
    }))];
  }

  private setIn<V>(sig: WritableSignal<Map<string, V>>, key: string, value: V): void {
    sig.update(m => new Map(m).set(key, value));
  }

  private deleteIn<V>(sig: WritableSignal<Map<string, V>>, key: string): void {
    sig.update(m => {
      const next = new Map(m);
      next.delete(key);
      return next;
    });
  }
}
