import {
  Component, ChangeDetectionStrategy, inject, OnInit, signal, computed,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { StartupService } from '../../startups/startup.service';
import { StartupDocumentsService } from '../../startups/startup-documents.service';
import { StartupDocument, DocumentType } from '../../../shared/models/startup-document.model';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import {
  getDocumentTypeLabel, getDocumentIcon, formatFileSize,
} from '../../../shared/utils/startup.utils';
import { formatRelativeTime } from '../../../shared/utils/format.utils';

type DocFilter = 'All' | DocumentType;

const FILTER_OPTIONS: { label: string; value: DocFilter }[] = [
  { label: 'Все',    value: 'All'    },
  { label: '🎯 Питч',   value: 'Pitch'  },
  { label: '📊 Отчёт', value: 'Report' },
  { label: '📄 Другое', value: 'Other'  },
];

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsComponent implements OnInit {
  private readonly auth      = inject(AuthService);
  private readonly startupSvc = inject(StartupService);
  private readonly docsSvc   = inject(StartupDocumentsService);

  constructor() { inject(Title).setTitle('Документы — DevStart'); }

  readonly filterOptions = FILTER_OPTIONS;

  readonly loading        = signal(true);
  readonly docs           = signal<StartupDocument[]>([]);
  readonly startupNames   = signal<Map<string, string>>(new Map());
  readonly activeFilter   = signal<DocFilter>('All');
  readonly deleting       = signal<Set<string>>(new Set());

  readonly filteredDocs = computed(() => {
    const f = this.activeFilter();
    return f === 'All'
      ? this.docs()
      : this.docs().filter(d => d.documentType === f);
  });

  ngOnInit(): void {
    const user = this.auth.user();
    if (!user) { this.loading.set(false); return; }

    forkJoin({
      docs:     this.docsSvc.getDocumentsByUploader(user.id).pipe(catchError(() => of([]))),
      startups: this.startupSvc.getStartupsByProfile(user.id).pipe(catchError(() => of([]))),
    }).subscribe(({ docs, startups }) => {
      this.docs.set(docs);
      this.startupNames.set(new Map(startups.map(s => [s.id, s.name])));
      this.loading.set(false);
    });
  }

  setFilter(f: DocFilter): void { this.activeFilter.set(f); }

  countByType(type: DocumentType): number {
    return this.docs().filter(d => d.documentType === type).length;
  }

  getStartupName(startupId: string): string {
    return this.startupNames().get(startupId) ?? 'Стартап';
  }

  removeDoc(doc: StartupDocument): void {
    this.docs.update(list => list.filter(d => d.id !== doc.id));
    this.docsSvc.deleteDocument(doc.id).subscribe({
      error: () => {
        const user = this.auth.user();
        if (user) {
          this.docsSvc.getDocumentsByUploader(user.id)
            .subscribe(list => this.docs.set(list));
        }
      },
    });
  }

  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly getDocumentIcon      = getDocumentIcon;
  protected readonly formatFileSize       = formatFileSize;
  protected readonly formatRelativeTime   = formatRelativeTime;
}
