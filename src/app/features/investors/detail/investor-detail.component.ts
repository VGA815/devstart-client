import { Component, ChangeDetectionStrategy, Input, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { InvestorProfileService } from '../investor-profile.service';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { InvestorProfile } from '../../../shared/models/investor-profile.model';

@Component({
  selector: 'app-investor-detail',
  standalone: true,
  imports: [AvatarComponent, SkeletonComponent],
  templateUrl: './investor-detail.component.html',
  styleUrl: './investor-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvestorDetailComponent implements OnInit {
  @Input() id!: string;

  private readonly titleSvc    = inject(Title);
  private readonly profileSvc  = inject(InvestorProfileService);

  readonly investor = signal<InvestorProfile | null>(null);
  readonly loading  = signal(true);
  readonly notFound = signal(false);

  ngOnInit(): void {
    this.profileSvc.getById(this.id).pipe(catchError(() => of(null))).subscribe(p => {
      if (p) {
        this.investor.set(p);
        this.titleSvc.setTitle(`${p.displayName} — DevStart`);
      } else {
        this.notFound.set(true);
        this.titleSvc.setTitle('Инвестор не найден — DevStart');
      }
      this.loading.set(false);
    });
  }

  typeLabel(type: string): string {
    return type === 'Individual' ? '👤 Физическое лицо' : '🏢 Фонд';
  }
}
