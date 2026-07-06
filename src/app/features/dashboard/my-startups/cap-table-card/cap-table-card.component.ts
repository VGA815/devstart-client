import {
  ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges,
  computed, inject, signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StartupEquityService } from '../../../startups/startup-equity.service';
import { StartupMembersService } from '../../../startups/startup-members.service';
import { ProfileService } from '../../../startups/profile.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { CapTable, CapTableHolder, EquityHolderType } from '../../../../shared/models/startup-equity.model';
import {
  HOLDER_TYPE_NUM, SetCapTableHolderRequestDto,
} from '../../../../shared/models/dto/startup-equity.dto';

/** One editable row of the cap-table editor (plain object, mutated via signal updates). */
interface EditRow {
  holderType:       EquityHolderType;
  profileId:        string | null;   // founder rows
  name:             string;          // non-founder rows
  equityPercentage: string;          // raw input, parsed on validation
  hasVesting:       boolean;
  vestingStartDate: string;          // yyyy-MM-dd
  vestingMonths:    string;
  cliffMonths:      string;
}

const HOLDER_TYPE_LABELS: Record<EquityHolderType, string> = {
  Founder: 'Основатель',
  Esop:    'ESOP-пул',
  Advisor: 'Советник',
  Other:   'Другое',
};

const HOLDER_TYPE_BADGE: Record<EquityHolderType, string> = {
  Founder: 'badge--purple',
  Esop:    'badge--accent',
  Advisor: 'badge--green',
  Other:   '',
};

// Mirrors the backend tolerance for the 100% sum check.
const SUM_TOLERANCE = 0.01;

@Component({
  selector: 'app-startup-cap-table-card',
  standalone: true,
  imports: [SkeletonComponent],
  templateUrl: './cap-table-card.component.html',
  styleUrl: './cap-table-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupCapTableCardComponent implements OnChanges {
  @Input({ required: true }) startupId!: string;

  private readonly svc        = inject(StartupEquityService);
  private readonly membersSvc = inject(StartupMembersService);
  private readonly profileSvc = inject(ProfileService);

  readonly capTable = signal<CapTable | null>(null);
  readonly loading  = signal(false);
  readonly loadError = signal(false);

  readonly editing  = signal(false);
  readonly saving   = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly rows     = signal<EditRow[]>([]);

  /** Founder members of the startup — the only valid targets for founder rows. */
  readonly founderOptions = signal<{ profileId: string; name: string }[]>([]);

  readonly typeOptions: EquityHolderType[] = ['Founder', 'Esop', 'Advisor', 'Other'];

  readonly sum = computed(() =>
    this.rows().reduce((acc, r) => acc + (parseNum(r.equityPercentage) ?? 0), 0));

  readonly sumOk = computed(() => Math.abs(this.sum() - 100) <= SUM_TOLERANCE);

  readonly rowErrors = computed(() => this.rows().map(r => validateRow(r)));

  readonly duplicateProfiles = computed(() => {
    const seen = new Set<string>();
    for (const r of this.rows()) {
      if (r.holderType !== 'Founder' || !r.profileId) continue;
      if (seen.has(r.profileId)) return true;
      seen.add(r.profileId);
    }
    return false;
  });

  readonly canSave = computed(() =>
    this.rows().length > 0
    && this.sumOk()
    && !this.duplicateProfiles()
    && this.rowErrors().every(e => e === null));

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startupId'] && this.startupId) {
      this.editing.set(false);
      this.load();
      this.loadFounders();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.svc.getCapTable(this.startupId).subscribe({
      next: table => {
        this.capTable.set(table);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  private loadFounders(): void {
    this.membersSvc.getMembers(this.startupId).subscribe({
      next: members => {
        const founders = members.filter(m => m.role === 'Founder');
        if (founders.length === 0) { this.founderOptions.set([]); return; }
        forkJoin(
          founders.map(f => this.profileSvc.getProfile(f.profileId).pipe(catchError(() => of(null))))
        ).subscribe(profiles => {
          this.founderOptions.set(
            founders.map((f, i) => ({
              profileId: f.profileId,
              name: profiles[i]?.name || `Основатель ${i + 1}`,
            })),
          );
        });
      },
      error: () => this.founderOptions.set([]),
    });
  }

  // ——— editing ———

  openEdit(): void {
    const table = this.capTable();
    if (!table) return;
    this.rows.set(table.holders.map(toEditRow));
    this.saveError.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  addRow(): void {
    this.rows.update(rows => [...rows, {
      holderType: 'Other',
      profileId: null,
      name: '',
      equityPercentage: '',
      hasVesting: false,
      vestingStartDate: '',
      vestingMonths: '',
      cliffMonths: '',
    }]);
  }

  removeRow(index: number): void {
    this.rows.update(rows => rows.filter((_, i) => i !== index));
  }

  patchRow(index: number, patch: Partial<EditRow>): void {
    this.rows.update(rows => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  setRowType(index: number, type: string): void {
    this.patchRow(index, { holderType: type as EquityHolderType });
  }

  toggleVesting(index: number): void {
    const row = this.rows()[index];
    if (!row) return;
    this.patchRow(index, row.hasVesting
      ? { hasVesting: false, vestingStartDate: '', vestingMonths: '', cliffMonths: '' }
      : { hasVesting: true, vestingMonths: '48', cliffMonths: '12' });
  }

  /** Distribute the remainder to 100% evenly across founder rows (quick-fix helper). */
  splitEvenly(): void {
    const rows = this.rows();
    if (rows.length === 0) return;
    const fixed = rows.filter(r => r.holderType !== 'Founder')
      .reduce((acc, r) => acc + (parseNum(r.equityPercentage) ?? 0), 0);
    const founders = rows.filter(r => r.holderType === 'Founder').length;
    if (founders === 0) return;
    const pool = Math.max(0, 100 - fixed);
    const per = Math.round((pool / founders) * 100) / 100;
    const residual = Math.round((pool - per * founders) * 100) / 100;
    let first = true;
    this.rows.update(list => list.map(r => {
      if (r.holderType !== 'Founder') return r;
      const share = first ? Math.round((per + residual) * 100) / 100 : per;
      first = false;
      return { ...r, equityPercentage: String(share) };
    }));
  }

  save(): void {
    if (!this.canSave() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);

    const holders: SetCapTableHolderRequestDto[] = this.rows().map(r => ({
      holder_type: HOLDER_TYPE_NUM[r.holderType],
      profile_id: r.holderType === 'Founder' ? r.profileId : null,
      name: r.holderType === 'Founder' ? null : r.name.trim(),
      equity_percentage: parseNum(r.equityPercentage) ?? 0,
      vesting_start_date: r.hasVesting ? r.vestingStartDate : null,
      vesting_months: r.hasVesting ? parseNum(r.vestingMonths) : null,
      cliff_months: r.hasVesting && r.cliffMonths !== '' ? parseNum(r.cliffMonths) : null,
    }));

    this.svc.setCapTable(this.startupId, { holders }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const desc = err.error?.errors?.[0]?.description;
        this.saveError.set(desc || 'Не удалось сохранить таблицу. Проверьте данные и попробуйте снова.');
      },
    });
  }

  // ——— view helpers ———

  typeLabel(type: EquityHolderType): string { return HOLDER_TYPE_LABELS[type]; }
  typeBadge(type: EquityHolderType): string { return HOLDER_TYPE_BADGE[type]; }

  vestingLabel(h: CapTableHolder): string {
    if (!h.vestingStartDate || !h.vestingMonths) return 'Без вестинга';
    const cliff = h.cliffMonths ? `, клифф ${h.cliffMonths} мес` : '';
    return `${h.vestingMonths} мес${cliff}`;
  }

  vestedPercent(h: CapTableHolder): number {
    return Math.round(h.vestedFraction * 100);
  }

  rowError(index: number): string | null {
    return this.rowErrors()[index] ?? null;
  }

  formatPct(value: number): string {
    return (Math.round(value * 100) / 100).toLocaleString('ru-RU');
  }
}

function toEditRow(h: CapTableHolder): EditRow {
  return {
    holderType: h.holderType,
    profileId: h.profileId,
    name: h.holderType === 'Founder' ? '' : h.name,
    equityPercentage: String(h.equityPercentage),
    hasVesting: !!(h.vestingStartDate && h.vestingMonths),
    vestingStartDate: h.vestingStartDate ? h.vestingStartDate.slice(0, 10) : '',
    vestingMonths: h.vestingMonths != null ? String(h.vestingMonths) : '',
    cliffMonths: h.cliffMonths != null ? String(h.cliffMonths) : '',
  };
}

function parseNum(raw: string): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Mirrors SetStartupCapTableCommandValidator: founder rows need a profile, other rows a
// name; percentages in [0, 100]; vesting is all-or-nothing with cliff ≤ duration.
function validateRow(r: EditRow): string | null {
  const pct = parseNum(r.equityPercentage);
  if (pct === null) return 'Укажите долю';
  if (pct < 0 || pct > 100) return 'Доля должна быть от 0 до 100';

  if (r.holderType === 'Founder' && !r.profileId) return 'Выберите основателя';
  if (r.holderType !== 'Founder' && !r.name.trim()) return 'Укажите название';

  if (r.hasVesting) {
    if (!r.vestingStartDate) return 'Укажите дату начала вестинга';
    const months = parseNum(r.vestingMonths);
    if (months === null || months <= 0 || !Number.isInteger(months)) return 'Срок вестинга — целое число месяцев больше 0';
    const cliff = r.cliffMonths.trim() === '' ? 0 : parseNum(r.cliffMonths);
    if (cliff === null || cliff < 0 || !Number.isInteger(cliff)) return 'Клифф — целое число месяцев';
    if (cliff > months) return 'Клифф не может быть больше срока вестинга';
  }

  return null;
}
