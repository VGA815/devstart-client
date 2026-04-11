import {
  ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, inject, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { StartupRoadmapService } from '../../../startups/startup-roadmap.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StartupRoadmapItem, RoadmapItemStatus } from '../../../../shared/models/startup-roadmap.model';
import { StartupStage } from '../../../../shared/models/startup.model';
import { ROADMAP_STATUS_OPTIONS, getRoadmapStatusClass } from '../../../../shared/utils/startup.utils';
import { formatQuarter } from '../../../../shared/utils/format.utils';
import { STAGE_NUM, ROADMAP_STATUS_NUM } from '../../../../shared/models/dto/startup-roadmap.dto';
import { optimisticDelete } from '../../../../shared/utils/optimistic.utils';

@Component({
  selector: 'app-startup-roadmap-card',
  standalone: true,
  imports: [ReactiveFormsModule, SkeletonComponent],
  templateUrl: './roadmap-card.component.html',
  styleUrl: './roadmap-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupRoadmapCardComponent implements OnChanges {
  @Input({ required: true }) startupId!: string;
  @Input({ required: true }) stage!: StartupStage;

  private readonly svc = inject(StartupRoadmapService);
  private readonly fb  = inject(FormBuilder);

  readonly statusOptions = ROADMAP_STATUS_OPTIONS;

  readonly items        = signal<StartupRoadmapItem[]>([]);
  readonly loading      = signal(false);
  readonly showAddForm  = signal(false);
  readonly saving       = signal(false);
  readonly updating     = signal(false);
  readonly newStatus    = signal(0);
  readonly editingId    = signal<string | null>(null);
  readonly editStatus   = signal(0);
  readonly expandedId   = signal<string | null>(null);

  readonly addForm = this.fb.group({
    title:      ['', [Validators.required, Validators.minLength(2)]],
    targetDate: ['', [Validators.required]],
  });

  readonly editForm = this.fb.group({
    title:       ['', [Validators.required, Validators.minLength(2)]],
    description: ['' as string | null],
    targetDate:  ['', [Validators.required]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startupId'] && this.startupId) this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.getRoadmapItems(this.startupId)
      .pipe(catchError(() => of([] as StartupRoadmapItem[])))
      .subscribe(items => {
        this.items.set(items);
        this.loading.set(false);
      });
  }

  toggleAdd(): void {
    this.showAddForm.update(v => !v);
    if (!this.showAddForm()) this.addForm.reset();
  }

  setNewStatus(i: number): void { this.newStatus.set(i); }

  add(): void {
    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    const v = this.addForm.getRawValue();
    this.saving.set(true);

    this.svc.addItem({
      startup_id:    this.startupId,
      startup_stage: STAGE_NUM[this.stage],
      title:         v.title!,
      status:        this.newStatus(),
      target_date:   v.targetDate!,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.addForm.reset();
        this.newStatus.set(0);
        this.showAddForm.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(item: StartupRoadmapItem): void {
    optimisticDelete(
      this.items,
      r => r.id === item.id,
      this.svc.deleteItem(item.id),
      () => this.load(),
    );
  }

  toggleExpand(item: StartupRoadmapItem): void {
    this.expandedId.update(id => id === item.id ? null : item.id);
  }

  startEdit(item: StartupRoadmapItem): void {
    this.expandedId.set(null);
    this.editingId.set(item.id);
    this.editStatus.set(ROADMAP_STATUS_NUM[item.status as RoadmapItemStatus] ?? 0);
    const datePart = item.targetDate?.slice(0, 10) ?? '';
    this.editForm.setValue({
      title: item.title,
      description: item.description ?? '',
      targetDate: datePart,
    });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editForm.reset();
  }

  setEditStatus(i: number): void { this.editStatus.set(i); }

  saveEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.editingId();
    if (!id) return;

    const v = this.editForm.getRawValue();
    this.updating.set(true);

    this.svc.updateItem({
      startup_id:    this.startupId,
      item_id:       id,
      startup_stage: STAGE_NUM[this.stage],
      title:         v.title!,
      description:   v.description || undefined,
      status:        this.editStatus(),
      target_date:   v.targetDate!,
    }).subscribe({
      next: () => {
        this.updating.set(false);
        this.editingId.set(null);
        this.editForm.reset();
        this.load();
      },
      error: () => this.updating.set(false),
    });
  }

  fieldError(name: string): string | null {
    const c = this.addForm.get(name);
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required')) return 'Обязательное поле';
    return null;
  }

  protected readonly getStatusClass = getRoadmapStatusClass;
  protected readonly formatDate     = formatQuarter;
}
