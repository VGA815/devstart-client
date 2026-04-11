import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output,
  SimpleChanges, computed, inject, signal,
} from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StartupMembersService } from '../../../startups/startup-members.service';
import { ProfileService } from '../../../startups/profile.service';
import { InviteTokenService } from '../../../startups/invite-token.service';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StartupMember, StartupRole } from '../../../../shared/models/startup.model';
import { Profile } from '../../../../shared/models/profile.model';
import { POSITION_OPTIONS, getPositionLabel } from '../../../../shared/utils/startup.utils';
import { optimisticDelete } from '../../../../shared/utils/optimistic.utils';
import { POSITION_NUM } from '../../../../shared/models/dto/startup.dto';

@Component({
  selector: 'app-startup-team-card',
  standalone: true,
  imports: [AvatarComponent, SkeletonComponent],
  templateUrl: './team-card.component.html',
  styleUrl: './team-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupTeamCardComponent implements OnChanges {
  @Input({ required: true }) startupId!: string;
  @Input({ required: true }) currentUserId!: string | null;

  @Output() readonly currentRoleChange = new EventEmitter<StartupRole | null>();

  private readonly svc        = inject(StartupMembersService);
  private readonly profileSvc = inject(ProfileService);
  private readonly inviteSvc  = inject(InviteTokenService);

  readonly positionOptions = POSITION_OPTIONS;

  readonly members        = signal<StartupMember[]>([]);
  readonly loading        = signal(false);
  readonly memberProfiles = signal<Map<string, Profile>>(new Map());

  readonly inviteLink      = signal<string | null>(null);
  readonly inviteGenerating = signal(false);
  readonly inviteCopied    = signal(false);

  readonly editing      = signal(false);
  readonly positionEdit = signal(0);
  readonly bioEdit      = signal('');
  readonly yearsEdit    = signal('');
  readonly hasPriorExit = signal(false);
  readonly prevStartups = signal('');
  readonly editSaving   = signal(false);
  readonly editError    = signal('');

  readonly myMember = computed(() => {
    const userId = this.currentUserId;
    if (!userId) return null;
    return this.members().find(m => m.profileId === userId) ?? null;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startupId'] && this.startupId) {
      this.inviteLink.set(null);
      this.inviteCopied.set(false);
      this.editing.set(false);
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.svc.getMembers(this.startupId).subscribe({
      next: items => {
        this.members.set(items);
        this.loading.set(false);
        this.emitMyRole();

        const valid = items.filter(m => !!m.profileId);
        if (valid.length === 0) { this.memberProfiles.set(new Map()); return; }
        forkJoin(
          Object.fromEntries(
            valid.map(m => [
              m.profileId,
              this.profileSvc.getProfile(m.profileId).pipe(catchError(() => of(null))),
            ])
          )
        ).subscribe(profileMap => {
          const map = new Map<string, Profile>();
          for (const [id, profile] of Object.entries(profileMap)) {
            if (profile) map.set(id, profile as Profile);
          }
          this.memberProfiles.set(map);
        });
      },
      error: () => this.loading.set(false),
    });
  }

  private emitMyRole(): void {
    this.currentRoleChange.emit(this.myMember()?.role ?? null);
  }

  generateInvite(): void {
    if (this.inviteGenerating()) return;
    this.inviteLink.set(null);
    this.inviteGenerating.set(true);
    this.inviteSvc.createToken(this.startupId).subscribe({
      next: tokenId => {
        this.inviteLink.set(`${window.location.origin}/invite/${tokenId}`);
        this.inviteGenerating.set(false);
      },
      error: () => this.inviteGenerating.set(false),
    });
  }

  copyInvite(): void {
    const link = this.inviteLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.inviteCopied.set(true);
      setTimeout(() => this.inviteCopied.set(false), 2000);
    });
  }

  remove(member: StartupMember): void {
    optimisticDelete(
      this.members,
      m => m.profileId === member.profileId,
      this.svc.removeMember(this.startupId, member.profileId),
      () => this.load(),
    );
  }

  getMemberName(m: StartupMember): string {
    return this.memberProfiles().get(m.profileId)?.name ?? 'Участник';
  }

  getMemberAvatarId(m: StartupMember): string | null {
    return this.memberProfiles().get(m.profileId)?.avatarId ?? null;
  }


  openEdit(): void {
    const me = this.myMember();
    if (!me) return;
    this.positionEdit.set(me.position ? POSITION_NUM[me.position] : 0);
    this.bioEdit.set(me.bio ?? '');
    this.yearsEdit.set(me.yearsOfExperience != null ? String(me.yearsOfExperience) : '');
    this.hasPriorExit.set(me.hasPriorExit ?? false);
    this.prevStartups.set(me.previousStartupsCount != null ? String(me.previousStartupsCount) : '');
    this.editError.set('');
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    this.editSaving.set(true);
    this.editError.set('');

    const years = this.yearsEdit().trim();
    const yearsNum = years ? parseInt(years, 10) : undefined;
    const prevCount = this.prevStartups().trim();
    const prevNum = prevCount ? parseInt(prevCount, 10) : undefined;

    this.svc.updateMemberProfile({
      startup_id:              this.startupId,
      position:                this.positionEdit() || undefined,
      bio:                     this.bioEdit().trim() || undefined,
      years_of_experience:     yearsNum && !isNaN(yearsNum) ? yearsNum : undefined,
      has_prior_exit:          this.hasPriorExit(),
      previous_startups_count: prevNum && !isNaN(prevNum) ? prevNum : undefined,
    }).subscribe({
      next: () => {
        this.editSaving.set(false);
        this.editing.set(false);
        this.load();
      },
      error: () => {
        this.editSaving.set(false);
        this.editError.set('Не удалось сохранить.');
      },
    });
  }

  protected readonly getPositionLabel = getPositionLabel;
}
