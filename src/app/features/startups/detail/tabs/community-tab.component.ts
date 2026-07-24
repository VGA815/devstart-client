import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';
import { formatRelativeTime } from '../../../../shared/utils/format.utils';
import {
  CommunityDocumentType, CommunityStandardsCheck,
} from '../../../../shared/models/community-standards.model';
import {
  getCommunityCheckMeta, getCommunityDocumentLabel,
  getCommunityLevelLabel, getCommunityLevelMod,
} from '../../../../shared/utils/community-standards.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

@Component({
  selector: 'app-community-tab',
  standalone: true,
  imports: [RouterLink, SkeletonComponent, MarkdownPipe],
  templateUrl: './community-tab.component.html',
  styleUrl: './community-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  /** Профильные сигналы и документы разводятся в две секции: у них разные CTA. */
  readonly profileChecks = computed<CommunityStandardsCheck[]>(
    () => this.facade.community()?.checks.filter(c => !c.isDocument) ?? []
  );

  readonly documentChecks = computed<CommunityStandardsCheck[]>(
    () => this.facade.community()?.checks.filter(c => c.isDocument) ?? []
  );

  /** Заголовок берём из опубликованного документа: стартап мог назвать его по-своему. */
  documentTitle(check: CommunityStandardsCheck): string {
    const published = this.facade.communityDocs().find(d => d.type === check.documentType);
    return published?.title
      ?? (check.documentType ? getCommunityDocumentLabel(check.documentType) : check.key);
  }

  documentBody(type: CommunityDocumentType): string | null {
    return this.facade.communityBodies().get(type)?.content ?? null;
  }

  documentUpdatedAt(type: CommunityDocumentType): string | null {
    return this.facade.communityDocs().find(d => d.type === type)?.updatedAt ?? null;
  }

  /** «Добавить» ведёт либо на страницу редактирования стартапа, либо в дашборд. */
  ctaLink(check: CommunityStandardsCheck): unknown[] {
    const startup = this.facade.startup();
    return getCommunityCheckMeta(check.key).target === 'edit' && startup
      ? ['/startups', startup.id, 'edit']
      : ['/dashboard/my-startups'];
  }

  toggleDoc(type: CommunityDocumentType | null): void {
    if (type) this.facade.toggleCommunityDoc(type);
  }

  protected readonly getCommunityCheckMeta  = getCommunityCheckMeta;
  protected readonly getCommunityLevelLabel = getCommunityLevelLabel;
  protected readonly getCommunityLevelMod   = getCommunityLevelMod;
  protected readonly formatRelativeTime     = formatRelativeTime;
}
