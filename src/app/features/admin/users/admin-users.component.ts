import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { AdminService } from '../admin.service';
import { AdminUserListItem, ROLE_LABELS } from '../admin.models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [RouterLink, SkeletonComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: '../admin-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent implements OnInit {
  private readonly admin = inject(AdminService);

  readonly loading  = signal(true);
  readonly error    = signal('');
  readonly users    = signal<AdminUserListItem[]>([]);

  readonly search       = signal('');
  readonly bannedFilter = signal<'all' | 'banned' | 'active'>('all');

  // id of the row with the ban form expanded
  readonly banFormFor = signal<string | null>(null);
  readonly banReason  = signal('');
  readonly banUntil   = signal('');
  readonly actionBusy = signal(false);
  readonly actionError = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    const banned = this.bannedFilter();
    this.admin.getUsers({
      search: this.search().trim() || undefined,
      isBanned: banned === 'all' ? undefined : banned === 'banned',
      pageSize: 100,
    }).pipe(
      catchError(() => {
        this.error.set('Не удалось загрузить пользователей.');
        return of([] as AdminUserListItem[]);
      })
    ).subscribe(list => {
      this.users.set(list);
      this.loading.set(false);
    });
  }

  setBannedFilter(value: string): void {
    this.bannedFilter.set(value as 'all' | 'banned' | 'active');
    this.load();
  }

  openBanForm(u: AdminUserListItem): void {
    this.banFormFor.set(u.id);
    this.banReason.set('');
    this.banUntil.set('');
    this.actionError.set('');
  }

  closeBanForm(): void { this.banFormFor.set(null); }

  submitBan(u: AdminUserListItem): void {
    const reason = this.banReason().trim();
    if (!reason || this.actionBusy()) return;

    this.actionBusy.set(true);
    this.actionError.set('');
    const expiresAt = this.banUntil() ? new Date(this.banUntil()).toISOString() : null;

    this.admin.banUser(u.id, reason, expiresAt).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.banFormFor.set(null);
        this.load();
      },
      error: () => {
        this.actionBusy.set(false);
        this.actionError.set('Не удалось забанить пользователя.');
      },
    });
  }

  unban(u: AdminUserListItem): void {
    if (this.actionBusy()) return;
    this.actionBusy.set(true);
    this.actionError.set('');

    this.admin.unbanUser(u.id).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.load();
      },
      error: () => {
        this.actionBusy.set(false);
        this.actionError.set('Не удалось снять бан.');
      },
    });
  }

  roleLabel(role: number): string { return ROLE_LABELS[role] ?? String(role); }

  formatDate(value: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium' }).format(new Date(value));
  }
}
