import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { InvestorProfileService } from '../../../investors/investor-profile.service';
import { InvestorProfile } from '../../../../shared/models/investor-profile.model';
import { StartupDetailFacade } from '../startup-detail.facade';

@Component({
  selector: 'app-investors-tab',
  standalone: true,
  imports: [RouterLink, AvatarComponent, SkeletonComponent],
  templateUrl: './investors-tab.component.html',
  styleUrl: './investors-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestorsTabComponent {
  protected readonly facade = inject(StartupDetailFacade);
  private readonly investorProfilesSvc = inject(InvestorProfileService);

  // founder/admin: add an investor from the public investors catalog
  readonly addFormOpen        = signal(false);
  readonly catalog            = signal<InvestorProfile[]>([]);
  readonly catalogLoading     = signal(false);
  readonly selectedProfileId  = signal('');
  readonly addAsPublic        = signal(true);
  readonly addSaving          = signal(false);
  readonly addError           = signal('');

  // own visibility in the list
  readonly visibilitySaving   = signal(false);
  readonly visibilityMessage  = signal<{ kind: 'ok' | 'err'; text: string } | null>(null);

  get amIListed(): boolean {
    const userId = this.facade.currentUserId;
    return !!userId && this.facade.investors().some(i => i.profileId === userId);
  }

  getInvestorName(profileId: string): string {
    return this.facade.investorProfilesMap().get(profileId)?.name ?? 'Инвестор';
  }

  sinceLabel(createdAt: string): string {
    return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date(createdAt));
  }

  openAddForm(): void {
    this.addFormOpen.set(true);
    this.addError.set('');
    if (this.catalog().length > 0 || this.catalogLoading()) return;

    this.catalogLoading.set(true);
    this.investorProfilesSvc.getPublicProfiles({ pageSize: 100 }).pipe(
      catchError(() => of([] as InvestorProfile[]))
    ).subscribe(list => {
      this.catalog.set(list);
      this.catalogLoading.set(false);
    });
  }

  closeAddForm(): void {
    this.addFormOpen.set(false);
  }

  submitAdd(): void {
    const profileId = this.selectedProfileId();
    if (!profileId || this.addSaving()) return;

    this.addSaving.set(true);
    this.addError.set('');

    this.facade.addInvestor(profileId, this.addAsPublic()).subscribe({
      next: () => {
        this.addSaving.set(false);
        this.addFormOpen.set(false);
        this.selectedProfileId.set('');
      },
      error: (err: HttpErrorResponse) => {
        this.addSaving.set(false);
        this.addError.set(err.status === 409
          ? 'Этот инвестор уже добавлен.'
          : 'Не удалось добавить инвестора.');
      },
    });
  }

  setMyVisibility(isPublic: boolean): void {
    if (this.visibilitySaving()) return;
    this.visibilitySaving.set(true);
    this.visibilityMessage.set(null);

    this.facade.changeMyInvestorVisibility(isPublic).subscribe({
      next: () => {
        this.visibilitySaving.set(false);
        this.visibilityMessage.set({
          kind: 'ok',
          text: isPublic ? 'Теперь вы видны в списке инвесторов.' : 'Вы скрыты из списка инвесторов.',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.visibilitySaving.set(false);
        this.visibilityMessage.set({
          kind: 'err',
          text: err.status === 404
            ? 'Вы не числитесь инвестором этого стартапа.'
            : 'Не удалось изменить видимость.',
        });
      },
    });
  }
}
