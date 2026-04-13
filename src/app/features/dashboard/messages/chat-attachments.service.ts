import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { ImageService } from '../../../shared/services/image.service';
import { StartupMetricsService } from '../../startups/startup-metrics.service';
import { StartupDocumentsService } from '../../startups/startup-documents.service';
import { Message } from '../../../shared/models/message.model';
import { StartupMetric } from '../../../shared/models/startup-metric.model';
import { StartupDocument } from '../../../shared/models/startup-document.model';


@Injectable()
export class ChatAttachmentsService {
  private readonly imageSvc = inject(ImageService);
  private readonly metricsSvc = inject(StartupMetricsService);
  private readonly docsSvc = inject(StartupDocumentsService);

  private readonly _mediaUrls = signal<Map<string, string>>(new Map());
  private readonly _metrics = signal<Map<string, StartupMetric>>(new Map());
  private readonly _documents = signal<Map<string, StartupDocument>>(new Map());

  mediaUrl(id: string): string | null {
    return this._mediaUrls().get(id) ?? null;
  }

  metric(id: string): StartupMetric | null {
    return this._metrics().get(id) ?? null;
  }

  document(id: string): StartupDocument | null {
    return this._documents().get(id) ?? null;
  }

  cacheMedia(id: string, url: string): void {
    this.setIn(this._mediaUrls, id, url);
  }

  cacheMetric(metric: StartupMetric): void {
    this.setIn(this._metrics, metric.id, metric);
  }

  cacheDocument(doc: StartupDocument): void {
    this.setIn(this._documents, doc.id, doc);
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
    for (const id of this.missing(messages.flatMap(m => m.documentIds), this._documents())) {
      this.docsSvc.getDocumentById(id).pipe(catchError(() => of(null))).subscribe(doc => {
        if (doc) this.cacheDocument(doc);
      });
    }
  }

  refetchMedia(id: string): void {
    this.imageSvc.invalidate(id);
    this.deleteIn(this._mediaUrls, id);
    this.imageSvc.getPresignedUrl(id).pipe(catchError(() => of(null))).subscribe(url => {
      if (url) this.cacheMedia(id, url);
    });
  }

  private missing(ids: string[], cache: Map<string, unknown>): string[] {
    return [...new Set(ids.filter(id => !cache.has(id)))];
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
