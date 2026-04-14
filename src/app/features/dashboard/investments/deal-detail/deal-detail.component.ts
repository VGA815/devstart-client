import {
  Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal, computed, Input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { marked } from 'marked';
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

  downloadPdf(): void {
    const ts = this.deal()?.termSheet;
    const d  = this.deal();
    if (!ts || !d) return;

    const htmlBody = marked.parse(ts, { async: false }) as string;
    const fullHtml = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Term Sheet — ${d.startupName}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:40px auto;color:#111;line-height:1.65;font-size:14px}
  h1{font-size:22px;font-weight:700;border-bottom:2px solid #1a6ed8;padding-bottom:12px;margin-bottom:24px}
  h2{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#666;margin:28px 0 10px;border-bottom:1px solid #e1e4e8;padding-bottom:6px}
  h3{font-size:14px;font-weight:600;margin:16px 0 6px}
  p{margin:0 0 10px}strong{font-weight:600}
  table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13px}
  th{background:#f5f7fa;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;border:1px solid #e1e4e8;font-weight:600}
  td{padding:8px 12px;border:1px solid #e1e4e8}
  ul,ol{margin:4px 0 14px;padding-left:20px}li{margin:4px 0}
  blockquote{margin:12px 0;padding:10px 16px;border-left:3px solid #1a6ed8;background:#f0f5ff;color:#444}
  hr{border:none;border-top:1px solid #e1e4e8;margin:24px 0}
  @media print{body{margin:20px;max-width:none}}
</style>
</head><body>${htmlBody}</body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(fullHtml);
    win.document.close();
    setTimeout(() => win.print(), 350);
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
