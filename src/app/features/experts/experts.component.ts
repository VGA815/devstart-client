import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { ExpertProfileService } from './expert-profile.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { ExpertProfile, ExpertSortBy, ExpertSpecialization } from '../../shared/models/expert-profile.model';
import { ALL_SPECIALIZATIONS, getSpecializationLabel } from '../../shared/utils/expert.utils';

@Component({
  selector: 'app-experts',
  standalone: true,
  imports: [RouterLink, SkeletonComponent, AvatarComponent],
  templateUrl: './experts.component.html',
  styleUrl: './experts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpertsComponent implements OnInit {
  private readonly profileSvc = inject(ExpertProfileService);

  readonly experts             = signal<ExpertProfile[]>([]);
  readonly loading             = signal(true);
  readonly selectedSpec        = signal<ExpertSpecialization | null>(null);
  readonly selectedSort        = signal<ExpertSortBy>('DisplayName');
  readonly searchQuery         = signal('');

  readonly specializations     = ALL_SPECIALIZATIONS;

  readonly filteredExperts = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.experts();
    return this.experts().filter(ex =>
      ex.displayName.toLowerCase().includes(q) ||
      (ex.bio?.toLowerCase().includes(q) ?? false)
    );
  });

  constructor() {
    inject(Title).setTitle('Эксперты — DevStart');
  }

  ngOnInit(): void {
    this.load();
  }

  selectSpecialization(value: string): void {
    this.selectedSpec.set(value ? value as ExpertSpecialization : null);
    this.load();
  }

  selectSort(value: string): void {
    this.selectedSort.set(value as ExpertSortBy);
    this.load();
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  private load(): void {
    this.loading.set(true);
    this.profileSvc.getPublicProfiles({
      page: 1,
      pageSize: 50,
      specialization: this.selectedSpec() ?? undefined,
      sortBy: this.selectedSort(),
    }).pipe(catchError(() => of([]))).subscribe(list => {
      this.experts.set(list);
      this.loading.set(false);
    });
  }

  protected readonly getSpecializationLabel = getSpecializationLabel;
}
