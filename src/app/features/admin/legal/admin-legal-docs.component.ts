import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import { ConsentDocument, CONSENT_TYPE_LABELS } from '../admin.models';

@Component({
  selector: 'app-admin-legal-docs',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './admin-legal-docs.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLegalDocsComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly loading = signal(true);
  readonly error   = signal('');
  // GET api/consent-documents returns the ACTIVE version of each type
  readonly docs    = signal<ConsentDocument[]>([]);

  // create form
  readonly formOpen  = signal(false);
  readonly type      = signal('0');
  readonly version   = signal('');
  readonly title     = signal('');
  readonly content   = signal('');
  readonly busy      = signal(false);
  readonly formError = signal('');
  // id of a just-created (inactive) document, offered for activation
  readonly createdId = signal<string | null>(null);
  readonly actionOk  = signal('');

  readonly typeOptions = Object.entries(CONSENT_TYPE_LABELS);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.admin.getConsentDocuments().pipe(
      catchError(() => {
        this.error.set('Не удалось загрузить документы.');
        return of([] as ConsentDocument[]);
      })
    ).subscribe(list => {
      this.docs.set(list);
      this.loading.set(false);
    });
  }

  submitCreate(): void {
    const version = this.version().trim();
    const title = this.title().trim();
    const content = this.content().trim();
    if (!version || !title || !content || this.busy()) return;

    this.busy.set(true);
    this.formError.set('');
    this.actionOk.set('');

    this.admin.createConsentDocument({
      type: +this.type(),
      version,
      title,
      content,
    }).subscribe({
      next: id => {
        this.busy.set(false);
        this.createdId.set(id);
        this.actionOk.set(`Версия ${version} создана (пока не активна).`);
      },
      error: (err) => {
        this.busy.set(false);
        this.formError.set(err?.error?.detail ?? 'Не удалось создать документ (версия может уже существовать).');
      },
    });
  }

  activateCreated(): void {
    const id = this.createdId();
    if (!id || this.busy()) return;

    this.busy.set(true);
    this.admin.activateConsentDocument(id).subscribe({
      next: () => {
        this.busy.set(false);
        this.createdId.set(null);
        this.formOpen.set(false);
        this.version.set('');
        this.title.set('');
        this.content.set('');
        this.actionOk.set('Версия активирована. Пользователи увидят её при следующем входе.');
        this.load();
      },
      error: () => {
        this.busy.set(false);
        this.formError.set('Не удалось активировать версию.');
      },
    });
  }

  typeLabel(v: number): string { return CONSENT_TYPE_LABELS[v] ?? String(v); }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value));
  }
}
