import {
  Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal, computed, Input,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { InvestmentDealService } from '../../../investors/investment-deal.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';
import { InvestmentDeal } from '../../../../shared/models/investment-deal.model';
import { formatMoney, formatRelativeTime } from '../../../../shared/utils/format.utils';

interface TermSheetSection {
  heading: string;
  rawContent: string;
}

@Component({
  selector: 'app-deal-detail',
  standalone: true,
  imports: [RouterLink, SkeletonComponent, MarkdownPipe],
  templateUrl: './deal-detail.component.html',
  styleUrl: './deal-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DealDetailComponent implements OnInit, OnDestroy {
  @Input() dealId!: string;

  private readonly auth = inject(AuthService);
  private readonly dealSvc = inject(InvestmentDealService);
  private readonly titleSvc = inject(Title);

  readonly loading = signal(true);
  readonly deal = signal<InvestmentDeal | null>(null);
  readonly error = signal<string | null>(null);
  readonly confirming = signal(false);
  readonly confirmError = signal('');
  readonly confirmSuccess = signal('');
  readonly regenerating = signal(false);
  readonly regenError = signal('');
  readonly regenSuccess = signal('');
  readonly pdfLoading = signal(false);
  readonly pdfError = signal('');
  readonly pdfMissing = signal(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly userId = computed(() => this.auth.user()?.id ?? '');

  readonly isInvestor = computed(() => {
    const d = this.deal();
    return !!d && d.investorProfileId === this.userId();
  });

  readonly canConfirm = computed(() => {
    const d = this.deal();
    if (!d || d.status !== 'InProgress') return false;
    if (this.isInvestor()) return !d.confirmedByInvestor;
    return !d.confirmedByStartup; // founder side
  });

  readonly instrumentLabel = computed(() => {
    return { Safe: 'SAFE', ConvertibleLoan: 'Конвертируемый заём', PricedRound: 'Priced Round' }[this.deal()?.instrument ?? 'Safe'] ?? '—';
  });

  readonly termSheetTitle = computed(() => {
    const ts = this.deal()?.termSheet;
    if (!ts) return '';
    const match = ts.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Term Sheet';
  });

  readonly termSheetSections = computed<TermSheetSection[]>(() => {
    const ts = this.deal()?.termSheet;
    if (!ts) return [];
    return this.parseTermSheetSections(ts);
  });

  readonly termSheetFileSize = computed(() => {
    const ts = this.deal()?.termSheet;
    if (!ts) return '';
    const bytes = new TextEncoder().encode(ts).length;
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  });


  ngOnInit(): void {
    this.titleSvc.setTitle('Детали сделки — DevStart');
    this.loadDeal();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private loadDeal(): void {
    this.loading.set(true);
    this.dealSvc.getById(this.dealId).pipe(
      catchError(() => of(null))
    ).subscribe(deal => {
      this.deal.set(deal);
      this.loading.set(false);
      if (deal) {
        this.titleSvc.setTitle(`Сделка ${deal.startupName} — DevStart`);
        if (!deal.documentsReady) {
          this.startPolling();
        }
      } else {
        this.error.set('Сделка не найдена или нет доступа.');
      }
    });
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      this.dealSvc.getById(this.dealId).pipe(catchError(() => of(null))).subscribe(deal => {
        if (!deal) return;
        this.deal.set(deal);
        if (deal.documentsReady && this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
      });
    }, 15_000);
  }

  confirmDeal(): void {
    if (!this.canConfirm() || this.confirming()) return;

    this.confirming.set(true);
    this.confirmError.set('');
    this.confirmSuccess.set('');

    const request$ = this.isInvestor()
      ? this.dealSvc.confirmByInvestor(this.dealId)
      : this.dealSvc.confirmByStartup(this.dealId);

    request$.pipe(catchError(() => of(null))).subscribe(result => {
      this.confirming.set(false);
      if (result === null) {
        this.confirmError.set('Не удалось подтвердить сделку. Попробуйте снова.');
        return;
      }
      this.confirmSuccess.set('Ваше подтверждение принято!');
      this.loadDeal();
    });
  }

  regenerateDocs(): void {
    if (this.regenerating()) return;
    this.regenerating.set(true);
    this.regenError.set('');
    this.regenSuccess.set('');
    this.pdfError.set('');
    this.pdfMissing.set(false);

    this.dealSvc.regenerateDocuments(this.dealId)
      .pipe(catchError(() => of(null)))
      .subscribe(result => {
        this.regenerating.set(false);
        if (result === null) {
          this.regenError.set('Не удалось запустить генерацию. Попробуйте снова.');
          return;
        }
        this.regenSuccess.set('Генерация запущена — обновите страницу через ~30 секунд.');
        this.startPolling();
      });
  }

  downloadMd(): void {
    const ts = this.deal()?.termSheet;
    if (!ts) return;
    const blob = new Blob([ts], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `term-sheet-${this.dealId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Downloads the PDF the server generated and stored, rather than asking the browser to print the
   * page. The link is presigned and carries its own file name; the access check happened server-side.
   */
  downloadPdf(): void {
    if (this.pdfLoading()) return;

    this.pdfLoading.set(true);
    this.pdfError.set('');

    this.dealSvc.getTermSheetDownloadUrl(this.dealId, 'pdf')
      .pipe(catchError((err: HttpErrorResponse) => of(err)))
      .subscribe(result => {
        this.pdfLoading.set(false);

        if (result instanceof HttpErrorResponse) {
          // A deal whose documents were generated before PDFs existed has everything except the PDF.
          // Regeneration fills it in, so say that rather than "try again", which would not help.
          this.pdfMissing.set(result.error?.code === 'DealDocuments.PdfNotGenerated');
          this.pdfError.set(this.pdfMissing()
            ? 'PDF для этой сделки ещё не сформирован.'
            : 'Не удалось получить файл. Попробуйте ещё раз.');
          return;
        }

        // Navigating the current tab avoids the popup blocker silently swallowing the click, which
        // is what window.open did here before.
        window.location.href = result.url;
      });
  }

  getBarWidth(row: { percentage: number }): number {
    return row.percentage;
  }

  private parseTermSheetSections(md: string): TermSheetSection[] {
    const sections: TermSheetSection[] = [];
    let heading = '';
    let lines: string[] = [];
    let inSection = false;

    for (const line of md.split('\n')) {
      if (line.startsWith('## ')) {
        if (inSection && lines.some(l => l.trim())) {
          sections.push({ heading, rawContent: lines.join('\n').trim() });
        }
        heading = line.slice(3).trim();
        lines = [];
        inSection = true;
      } else if (line.startsWith('# ')) {
      } else if (inSection) {
        lines.push(line);
      }
    }
    if (inSection && lines.some(l => l.trim())) {
      sections.push({ heading, rawContent: lines.join('\n').trim() });
    }
    return sections;
  }

  protected readonly formatMoney = formatMoney;
  protected readonly formatRelativeTime = formatRelativeTime;
}
