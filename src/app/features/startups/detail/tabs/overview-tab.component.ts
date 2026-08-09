import {
  Component, ChangeDetectionStrategy, ElementRef, afterRenderEffect, inject, signal, viewChild,
} from '@angular/core';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';
import { formatMoney } from '../../../../shared/utils/format.utils';
import { getMetricLabel, getMetricColor, formatMetricValue } from '../../../../shared/utils/startup.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

/** Высота свёрнутого описания — держать в паре с `.sd-desc-wrap` max-height. */
const COLLAPSED_DESC_HEIGHT = 260;

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [SkeletonComponent, MarkdownPipe],
  templateUrl: './overview-tab.component.html',
  styleUrl: './overview-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  private readonly desc = viewChild<ElementRef<HTMLElement>>('desc');

  readonly descExpanded = signal(false);
  /** Короткое описание не обрезается — кнопка «Читать полностью» и градиент были бы обманом. */
  readonly descOverflows = signal(false);

  constructor() {
    afterRenderEffect(() => {
      // Пересчитываем при смене стартапа: описание приезжает асинхронно
      this.facade.startup();

      const el = this.desc()?.nativeElement;
      this.descOverflows.set(!!el && el.scrollHeight > COLLAPSED_DESC_HEIGHT);
    });
  }

  toggleDesc(): void {
    this.descExpanded.update(v => !v);
  }

  protected readonly formatMoney       = formatMoney;
  protected readonly getMetricLabel    = getMetricLabel;
  protected readonly getMetricColor    = getMetricColor;
  protected readonly formatMetricValue = formatMetricValue;
}
