import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '16px';
  @Input() borderRadius = 'var(--radius)';
}
