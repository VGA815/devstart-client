import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { getPositionLabel } from '../../../../shared/utils/startup.utils';
import { StartupDetailFacade } from '../startup-detail.facade';

const ROLE_COLORS: Record<string, string> = {
  Founder: '#2f81f7',
  Administration: '#bc8cff',
  Member: '#3fb950',
};

const POSITION_NUM: Record<string, number> = {
  Other: 0, CEO: 1, CTO: 2, CMO: 3, COO: 4, CFO: 5, CPO: 6,
};

const POSITION_OPTIONS = [
  { label: '— Не указана —', value: 0 },
  { label: 'CEO',  value: 1 },
  { label: 'CTO',  value: 2 },
  { label: 'CMO',  value: 3 },
  { label: 'COO',  value: 4 },
  { label: 'CFO',  value: 5 },
  { label: 'CPO',  value: 6 },
];

@Component({
  selector: 'app-team-tab',
  standalone: true,
  imports: [RouterLink, AvatarComponent, SkeletonComponent],
  templateUrl: './team-tab.component.html',
  styleUrl: './team-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamTabComponent {
  protected readonly facade = inject(StartupDetailFacade);

  readonly editingMemberProfile = signal(false);
  readonly memberPositionEdit   = signal(0);
  readonly memberBioEdit        = signal('');
  readonly memberYearsEdit      = signal('');
  readonly memberHasPriorExit   = signal(false);
  readonly memberPrevStartups   = signal('');
  readonly memberProfileSaving  = signal(false);
  readonly memberProfileError   = signal('');
  readonly memberProfileSuccess = signal(false);

  readonly positionOptions = POSITION_OPTIONS;

  openMemberProfileEdit(): void {
    const me = this.facade.myMember();
    if (!me) return;
    this.memberPositionEdit.set(me.position ? (POSITION_NUM[me.position] ?? 0) : 0);
    this.memberBioEdit.set(me.bio ?? '');
    this.memberYearsEdit.set(me.yearsOfExperience != null ? String(me.yearsOfExperience) : '');
    this.memberHasPriorExit.set(me.hasPriorExit ?? false);
    this.memberPrevStartups.set(me.previousStartupsCount != null ? String(me.previousStartupsCount) : '');
    this.memberProfileError.set('');
    this.memberProfileSuccess.set(false);
    this.editingMemberProfile.set(true);
  }

  cancelMemberProfileEdit(): void {
    this.editingMemberProfile.set(false);
  }

  saveMemberProfile(): void {
    this.memberProfileSaving.set(true);
    this.memberProfileError.set('');

    const years = this.memberYearsEdit().trim();
    const yearsNum = years ? parseInt(years, 10) : undefined;
    const prevCount = this.memberPrevStartups().trim();
    const prevNum = prevCount ? parseInt(prevCount, 10) : undefined;

    this.facade.saveMemberProfile({
      position: this.memberPositionEdit() || undefined,
      bio: this.memberBioEdit().trim() || undefined,
      years_of_experience: yearsNum && !isNaN(yearsNum) ? yearsNum : undefined,
      has_prior_exit: this.memberHasPriorExit(),
      previous_startups_count: prevNum && !isNaN(prevNum) ? prevNum : undefined,
    }).subscribe({
      next: () => {
        this.memberProfileSaving.set(false);
        this.memberProfileSuccess.set(true);
        this.editingMemberProfile.set(false);
      },
      error: () => {
        this.memberProfileSaving.set(false);
        this.memberProfileError.set('Не удалось сохранить профиль.');
      },
    });
  }

  getMemberDisplayName(profileId: string): string {
    return this.facade.memberProfiles().get(profileId)?.name ?? 'Участник';
  }

  getMemberAvatarId(profileId: string): string | null {
    return this.facade.memberProfiles().get(profileId)?.avatarId ?? null;
  }

  getMemberColor(role: string): string {
    return ROLE_COLORS[role] ?? '#7d8590';
  }

  protected readonly getPositionLabel = getPositionLabel;
}
