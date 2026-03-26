import { HttpClient } from '@angular/common/http';
import {
  DestroyRef, Injectable, Signal, effect, inject, signal,
} from '@angular/core';
import { Observable, Subscription, of, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface ImageResponse {
  id: string;
  presignedUrl: string;
  fileSize: number;
  uploadDate: string;
  uploaderId: string;
}

// Presigned URL TTL from MinIO is 600s.
// Cache for 420–480s (7–8 min)
const CACHE_TTL_BASE_MS   = 420_000;
const CACHE_TTL_JITTER_MS =  60_000;


@Injectable({ providedIn: 'root' })
export class ImageService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users/avatars`;

  private readonly urlCache = new Map<string, { url: string; expiresAt: number }>();
  private readonly inflight = new Map<string, Observable<string>>();

  upload(file: File, ownerId: string): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<string>(`${this.base}?ownerId=${ownerId}`, form);
  }


  
  getPresignedUrl(imageId: string): Observable<string> {
    const cached = this.urlCache.get(imageId);
    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.url);
    }

    const existing = this.inflight.get(imageId);
    if (existing) return existing;

    const request$ = this.http.get<ImageResponse>(`${this.base}/${imageId}`).pipe(
      map(r => {
        const ttl = CACHE_TTL_BASE_MS + Math.random() * CACHE_TTL_JITTER_MS;
        this.urlCache.set(imageId, { url: r.presignedUrl, expiresAt: Date.now() + ttl });
        this.inflight.delete(imageId);
        return r.presignedUrl;
      }),
      catchError(err => {
        this.inflight.delete(imageId);
        return throwError(() => err);
      }),
      shareReplay(1),
    );

    this.inflight.set(imageId, request$);
    return request$;
  }

  invalidate(imageId: string): void {
    this.urlCache.delete(imageId);
    this.inflight.delete(imageId);
  }
}



export interface ResolvedImage {
  url: Signal<string | null>;
  loading: Signal<boolean>;
  error: Signal<boolean>;

  retry: () => void;
}

const MAX_RETRIES = 2;



export function injectImageUrl(idSignal: () => string | null): ResolvedImage {
  const svc = inject(ImageService);
  const destroyRef = inject(DestroyRef);

  const url     = signal<string | null>(null);
  const loading = signal(false);
  const error   = signal(false);

  let sub: Subscription | undefined;
  let currentId: string | null = null;
  let retries = 0;

  const fetch = (id: string | null) => {
    sub?.unsubscribe();
    currentId = id;
    if (!id) {
      url.set(null); loading.set(false); error.set(false);
      return;
    }
    loading.set(true);
    sub = svc.getPresignedUrl(id).subscribe({
      next: u => { url.set(u); loading.set(false); error.set(false); retries = 0; },
      error: () => { loading.set(false); error.set(true); },
    });
  };

  effect(() => {
    const id = idSignal();
    retries = 0;
    error.set(false);
    fetch(id);
  });

  destroyRef.onDestroy(() => sub?.unsubscribe());

  return {
    url:     url.asReadonly(),
    loading: loading.asReadonly(),
    error:   error.asReadonly(),
    retry: () => {
      if (!currentId) { error.set(true); return; }
      if (retries >= MAX_RETRIES) { error.set(true); return; }
      retries++;
      svc.invalidate(currentId);
      fetch(currentId);
    },
  };
}
