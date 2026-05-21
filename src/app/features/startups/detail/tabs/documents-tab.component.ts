import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { getDocumentTypeLabel, getDocumentIcon, formatFileSize } from '../../../../shared/utils/startup.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './documents-tab.component.html',
  styleUrl: './documents-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentsTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly getDocumentIcon      = getDocumentIcon;
  protected readonly formatFileSize       = formatFileSize;
}
