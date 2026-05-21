import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StartupRoadmapItem } from '../../../../shared/models/startup-roadmap.model';
import { formatQuarter, formatMoney } from '../../../../shared/utils/format.utils';
import { getRoadmapStatusClass, getRoadmapStatusLabel } from '../../../../shared/utils/startup.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

@Component({
  selector: 'app-roadmap-tab',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './roadmap-tab.component.html',
  styleUrl: './roadmap-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  readonly expandedRoadmapId = signal<string | null>(null);

  toggleRoadmapExpand(item: StartupRoadmapItem): void {
    this.expandedRoadmapId.update(id => id === item.id ? null : item.id);
  }

  protected readonly formatTargetDate      = formatQuarter;
  protected readonly formatMoney           = formatMoney;
  protected readonly getRoadmapStatusClass = getRoadmapStatusClass;
  protected readonly getRoadmapStatusLabel = getRoadmapStatusLabel;
}
