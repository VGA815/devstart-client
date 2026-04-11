import {
  ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, inject, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { StartupMetricsService } from '../../../startups/startup-metrics.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { StartupMetric } from '../../../../shared/models/startup-metric.model';
import {
  METRIC_TYPE_OPTIONS, formatMetricValue, getMetricColor, getMetricLabel,
} from '../../../../shared/utils/startup.utils';
import { optimisticDelete } from '../../../../shared/utils/optimistic.utils';

@Component({
  selector: 'app-startup-metrics-card',
  standalone: true,
  imports: [ReactiveFormsModule, SkeletonComponent],
  templateUrl: './metrics-card.component.html',
  styleUrl: './metrics-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartupMetricsCardComponent implements OnChanges {
  @Input({ required: true }) startupId!: string;

  private readonly svc = inject(StartupMetricsService);
  private readonly fb  = inject(FormBuilder);

  readonly metricOptions = METRIC_TYPE_OPTIONS;

  readonly metrics      = signal<StartupMetric[]>([]);
  readonly loading      = signal(false);
  readonly showAddForm  = signal(false);
  readonly saving       = signal(false);
  readonly newType      = signal(0);

  readonly form = this.fb.group({
    value: [null as number | null, [Validators.required, Validators.min(0)]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startupId'] && this.startupId) this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.svc.getMetrics(this.startupId)
      .pipe(catchError(() => of([] as StartupMetric[])))
      .subscribe(list => {
        this.metrics.set(list);
        this.loading.set(false);
      });
  }

  toggleAdd(): void {
    this.showAddForm.update(v => !v);
    if (!this.showAddForm()) this.form.reset();
  }

  setType(i: number): void { this.newType.set(i); }

  add(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    this.svc.addMetric({
      startup_id:  this.startupId,
      metric_type: this.newType(),
      value:       this.form.getRawValue().value!,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.newType.set(0);
        this.showAddForm.set(false);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(metric: StartupMetric): void {
    optimisticDelete(
      this.metrics,
      m => m.id === metric.id,
      this.svc.deleteMetric(metric.id),
      () => this.load(),
    );
  }

  fieldError(): string | null {
    const c = this.form.get('value');
    if (!c?.touched || !c.invalid) return null;
    if (c.hasError('required')) return 'Укажите значение';
    if (c.hasError('min'))      return 'Значение не может быть отрицательным';
    return null;
  }

  protected readonly getMetricLabel    = getMetricLabel;
  protected readonly getMetricColor    = getMetricColor;
  protected readonly formatMetricValue = formatMetricValue;
}
