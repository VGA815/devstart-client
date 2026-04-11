import {
  ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, inject, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { StartupDocumentsService } from '../../../startups/startup-documents.service';
import { StartupDocument } from '../../../../shared/models/startup-document.model';
import {
  DOC_TYPE_OPTIONS, formatFileSize, getDocumentIcon, getDocumentTypeLabel,
} from '../../../../shared/utils/startup.utils';
import { optimisticDelete } from '../../../../shared/utils/optimistic.utils';

@Component({
  selector: 'app-startup-docs-card',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './docs-card.component.html',
  styleUrl: './docs-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupDocsCardComponent implements OnChanges {
  @Input({ required: true }) startupId!: string;

  private readonly svc = inject(StartupDocumentsService);
  private readonly fb  = inject(FormBuilder);

  readonly docTypeOptions = DOC_TYPE_OPTIONS;

  readonly docs         = signal<StartupDocument[]>([]);
  readonly showAddForm  = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly newType      = signal(0);
  readonly uploading    = signal(false);

  readonly form = this.fb.group({
    documentName: ['', [Validators.required]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startupId'] && this.startupId) {
      this.resetForm();
      this.load();
    }
  }

  private load(): void {
    this.svc.getDocuments(this.startupId)
      .pipe(catchError(() => of([] as StartupDocument[])))
      .subscribe(list => this.docs.set(list));
  }

  private resetForm(): void {
    this.showAddForm.set(false);
    this.selectedFile.set(null);
    this.newType.set(0);
    this.form.reset();
  }

  toggleAdd(): void {
    this.showAddForm.update(v => !v);
    if (!this.showAddForm()) this.resetForm();
  }

  setType(i: number): void { this.newType.set(i); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    if (file && !this.form.get('documentName')?.value) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      this.form.get('documentName')!.setValue(nameWithoutExt);
    }
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file || this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.uploading.set(true);
    this.svc.uploadDocument({
      startupId:    this.startupId,
      file,
      documentName: this.form.getRawValue().documentName!,
      documentType: this.newType(),
    }).subscribe({
      next: () => {
        this.uploading.set(false);
        this.resetForm();
        this.load();
      },
      error: () => this.uploading.set(false),
    });
  }

  remove(doc: StartupDocument): void {
    optimisticDelete(
      this.docs,
      d => d.id === doc.id,
      this.svc.deleteDocument(doc.id),
      () => this.load(),
    );
  }

  fieldError(): string | null {
    const c = this.form.get('documentName');
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required')) return 'Укажите название документа';
    return null;
  }

  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly getDocumentIcon      = getDocumentIcon;
  protected readonly formatFileSize       = formatFileSize;
}
