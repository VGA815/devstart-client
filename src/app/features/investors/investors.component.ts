import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { InvestorProfileService } from './investor-profile.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { InvestorProfile, InvestorProfileType, InvestorSortBy } from '../../shared/models/investor-profile.model';

@Component({
  selector: 'app-investors',
  standalone: true,
  imports: [RouterLink, SkeletonComponent, AvatarComponent],
  templateUrl: './investors.component.html',
  styleUrl: './investors.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestorsComponent implements OnInit {
  private readonly profileSvc = inject(InvestorProfileService);

  readonly investors     = signal<InvestorProfile[]>([]);
  readonly loading       = signal(true);
  readonly selectedType  = signal<InvestorProfileType | null>(null);
  readonly selectedSort  = signal<InvestorSortBy>('DisplayName');
  readonly searchQuery   = signal('');

  readonly filteredInvestors = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.investors();
    return this.investors().filter(inv =>
      inv.displayName.toLowerCase().includes(q) ||
      (inv.bio?.toLowerCase().includes(q) ?? false)
    );
  });

  constructor() {
    inject(Title).setTitle('Инвесторы — DevStart');
  }

  ngOnInit(): void {
    this.load();
  }

  selectType(value: string): void {
    this.selectedType.set(value ? value as InvestorProfileType : null);
    this.load();
  }

  selectSort(value: string): void {
    this.selectedSort.set(value as InvestorSortBy);
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
      type: this.selectedType() ?? undefined,
      sortBy: this.selectedSort(),
    }).pipe(catchError(() => of([]))).subscribe(list => {
      this.investors.set(list);
      this.loading.set(false);
    });
  }

  typeLabel(type: string): string {
    return type === 'Individual' ? '👤 Физическое лицо' : '🏢 Фонд';
  }
}
