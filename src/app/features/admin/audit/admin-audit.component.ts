import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import { AdminAuditEntry, ACTION_TYPE_LABELS, TARGET_TYPE_LABELS } from '../admin.models';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './admin-audit.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAuditComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly loading = signal(true);
  readonly error   = signal('');
  readonly entries = signal<AdminAuditEntry[]>([]);

  readonly targetTypeFilter = signal('');
  readonly page             = signal(1);

  readonly targetTypeOptions = Object.entries(TARGET_TYPE_LABELS);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    const targetType = this.targetTypeFilter() === '' ? undefined : +this.targetTypeFilter();

    this.admin.getAuditLog(targetType, undefined, this.page(), 50).pipe(
      catchError(() => {
        this.error.set('Не удалось загрузить аудит-лог.');
        return of([] as AdminAuditEntry[]);
      })
    ).subscribe(list => {
      this.entries.set(list);
      this.loading.set(false);
    });
  }

  setFilter(value: string): void {
    this.targetTypeFilter.set(value);
    this.page.set(1);
    this.load();
  }

  prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update(p => p - 1);
    this.load();
  }

  nextPage(): void {
    this.page.update(p => p + 1);
    this.load();
  }

  actionLabel(v: number): string { return ACTION_TYPE_LABELS[v] ?? String(v); }
  targetLabel(v: number): string { return TARGET_TYPE_LABELS[v] ?? String(v); }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }
}
