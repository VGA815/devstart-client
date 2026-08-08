import { Component, ChangeDetectionStrategy, inject, signal, Input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ConsentService } from '../../../core/consents/consent.service';
import { ConsentDocumentDto } from '../../../shared/models/dto/consent.dto';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-legal-document',
  standalone: true,
  imports: [MarkdownPipe, RouterLink],
  templateUrl: './legal-document.component.html',
  styleUrl: './legal-document.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalDocumentComponent {
  private readonly consentService = inject(ConsentService);
  private readonly titleService = inject(Title);

  private _type = 0;

  @Input() set type(value: string) {
    this._type = parseInt(value, 10);
    this.loadDocument(this._type);
  }

  readonly document = signal<ConsentDocumentDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private loadDocument(type: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.consentService.getDocument(type).subscribe({
      next: doc => {
        if (type !== this._type) return;
        this.document.set(doc);
        this.titleService.setTitle(`${doc.title} — DevStart`);
        this.loading.set(false);
      },
      error: () => {
        if (type !== this._type) return;
        this.error.set('Документ не найден.');
        this.loading.set(false);
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
