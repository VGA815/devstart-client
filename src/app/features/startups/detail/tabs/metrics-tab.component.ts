import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { getMetricLabel, formatMetricValue } from '../../../../shared/utils/startup.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

@Component({
  selector: 'app-metrics-tab',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './metrics-tab.component.html',
  styleUrl: './metrics-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricsTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  protected readonly getMetricLabel    = getMetricLabel;
  protected readonly formatMetricValue = formatMetricValue;
}
