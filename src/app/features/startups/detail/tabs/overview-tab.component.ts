import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';
import { formatMoney } from '../../../../shared/utils/format.utils';
import { getMetricLabel, getMetricColor, formatMetricValue } from '../../../../shared/utils/startup.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

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

  readonly descExpanded = signal(false);

  toggleDesc(): void {
    this.descExpanded.update(v => !v);
  }

  protected readonly formatMoney       = formatMoney;
  protected readonly getMetricLabel    = getMetricLabel;
  protected readonly getMetricColor    = getMetricColor;
  protected readonly formatMetricValue = formatMetricValue;
}
