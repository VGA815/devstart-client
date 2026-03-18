import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

export type TagColor = 'accent' | 'green' | 'yellow' | 'red' | 'purple' | 'default';

@Component({
  selector: 'app-tag',
  standalone: true,
  templateUrl: './tag.component.html',
  styleUrl: './tag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagComponent {
  @Input() color: TagColor = 'default';
}
