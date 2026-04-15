import { Component, ChangeDetectionStrategy, inject, signal, Input, OnInit } from '@angular/core';
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
export class LegalDocumentComponent implements OnInit {
  private readonly consentService = inject(ConsentService);
  private readonly titleService = inject(Title);

  private _type = 0;

  @Input() set type(value: string) {
    this._type = parseInt(value, 10);
  }

  readonly document = signal<ConsentDocumentDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.consentService.getDocument(this._type).subscribe({
      next: doc => {
        this.document.set(doc);
        this.titleService.setTitle(`${doc.title} — DevStart`);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Документ не найден.');
        this.loading.set(false);
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
