import {
  ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, inject, signal, computed,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';

import { CommunityStandardsService } from '../../../startups/community-standards.service';
import { MarkdownEditorComponent } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import {
  CommunityDocumentSummary, CommunityDocumentType, CommunityStandards,
} from '../../../../shared/models/community-standards.model';
import {
  COMMUNITY_DOC_TYPES, getCommunityCheckMeta, getCommunityDocumentHint,
  getCommunityDocumentLabel, getCommunityLevelLabel, getCommunityLevelMod,
} from '../../../../shared/utils/community-standards.utils';

const MAX_CONTENT_LENGTH = 100_000;

@Component({
  selector: 'app-startup-community-card',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MarkdownEditorComponent],
  templateUrl: './community-card.component.html',
  styleUrl: './community-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupCommunityCardComponent implements OnChanges {
  @Input({ required: true }) startupId!: string;

  private readonly svc = inject(CommunityStandardsService);
  private readonly fb  = inject(FormBuilder);

  readonly docTypes = COMMUNITY_DOC_TYPES;
  readonly maxContentLength = MAX_CONTENT_LENGTH;

  readonly standards = signal<CommunityStandards | null>(null);
  readonly docs      = signal<CommunityDocumentSummary[]>([]);
  readonly loading   = signal(true);

  readonly editingType = signal<CommunityDocumentType | null>(null);
  readonly saving      = signal(false);
  readonly deletingType = signal<CommunityDocumentType | null>(null);
  readonly loadingTemplate = signal(false);
  readonly error       = signal<string | null>(null);

  readonly form = this.fb.group({
    title:   ['', [Validators.required, Validators.maxLength(200)]],
    content: ['', [Validators.required, Validators.maxLength(MAX_CONTENT_LENGTH)]],
  });

  /** Незакрытые профильные пункты — по ним владельцу есть что доделать вне этой карточки. */
  readonly pendingProfileChecks = computed(
    () => this.standards()?.checks.filter(c => !c.isDocument && !c.isSatisfied) ?? []
  );

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startupId'] && this.startupId) {
      this.closeEditor();
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      standards: this.svc.getStandards(this.startupId).pipe(catchError(() => of(null))),
      docs: this.svc.getDocuments(this.startupId).pipe(catchError(() => of([] as CommunityDocumentSummary[]))),
    }).subscribe(({ standards, docs }) => {
      this.standards.set(standards);
      this.docs.set(docs);
      this.loading.set(false);
    });
  }

  isPublished(type: CommunityDocumentType): boolean {
    return this.docs().some(d => d.type === type);
  }

  publishedTitle(type: CommunityDocumentType): string | null {
    return this.docs().find(d => d.type === type)?.title ?? null;
  }

  /**
   * Открывает редактор: у опубликованного документа подтягиваем текущий markdown,
   * у нового — оставляем поля пустыми, стартовый текст берётся кнопкой «Шаблон».
   */
  edit(type: CommunityDocumentType): void {
    if (this.editingType() === type) { this.closeEditor(); return; }

    this.editingType.set(type);
    this.error.set(null);
    this.form.reset({ title: '', content: '' });

    if (!this.isPublished(type)) {
      this.form.patchValue({ title: getCommunityDocumentLabel(type) });
      return;
    }

    this.svc.getDocument(this.startupId, type).pipe(
      catchError(() => of(null))
    ).subscribe(doc => {
      if (doc) this.form.patchValue({ title: doc.title, content: doc.content });
    });
  }

  closeEditor(): void {
    this.editingType.set(null);
    this.error.set(null);
    this.form.reset({ title: '', content: '' });
  }

  /** Подставляет стартовый текст платформы, не затирая уже написанное без подтверждения. */
  applyTemplate(): void {
    const type = this.editingType();
    if (!type || this.loadingTemplate()) return;

    const written = this.form.getRawValue().content?.trim();
    if (written && !confirm('Шаблон заменит уже написанный текст. Продолжить?')) return;

    this.loadingTemplate.set(true);
    this.svc.getTemplates().pipe(
      catchError(() => of([]))
    ).subscribe(templates => {
      const template = templates.find(t => t.type === type);
      if (template) {
        this.form.patchValue({ title: template.title, content: template.content });
      } else {
        this.error.set('Шаблон недоступен');
      }
      this.loadingTemplate.set(false);
    });
  }

  save(): void {
    const type = this.editingType();
    if (!type) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.error.set(null);
    const { title, content } = this.form.getRawValue();

    this.svc.upsertDocument(this.startupId, type, { title: title!, content: content! }).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeEditor();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(err.status === 403
          ? 'Менять документы могут только основатель и администраторы стартапа'
          : 'Не удалось сохранить документ');
      },
    });
  }

  remove(type: CommunityDocumentType): void {
    if (this.deletingType()) return;

    this.deletingType.set(type);
    this.svc.deleteDocument(this.startupId, type).subscribe({
      next: () => {
        this.deletingType.set(null);
        if (this.editingType() === type) this.closeEditor();
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deletingType.set(null);
        this.error.set(err.status === 403
          ? 'Менять документы могут только основатель и администраторы стартапа'
          : 'Не удалось удалить документ');
      },
    });
  }

  fieldError(name: 'title' | 'content'): string | null {
    const c = this.form.get(name);
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required')) return name === 'title' ? 'Укажите заголовок' : 'Добавьте текст документа';
    if (c.hasError('maxlength')) return 'Слишком длинный текст';
    return null;
  }

  protected readonly getCommunityDocumentLabel = getCommunityDocumentLabel;
  protected readonly getCommunityDocumentHint  = getCommunityDocumentHint;
  protected readonly getCommunityCheckMeta     = getCommunityCheckMeta;
  protected readonly getCommunityLevelLabel    = getCommunityLevelLabel;
  protected readonly getCommunityLevelMod      = getCommunityLevelMod;
}
