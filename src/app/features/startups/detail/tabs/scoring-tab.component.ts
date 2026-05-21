import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { formatMoney, formatRelativeTime } from '../../../../shared/utils/format.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

@Component({
  selector: 'app-scoring-tab',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './scoring-tab.component.html',
  styleUrl: './scoring-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoringTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  protected readonly formatMoney         = formatMoney;
  protected readonly formatRelativeTime  = formatRelativeTime;
}
