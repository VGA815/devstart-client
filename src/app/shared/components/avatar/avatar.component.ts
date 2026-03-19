import { Component, ChangeDetectionStrategy, Input, computed, signal } from '@angular/core';
import { injectImageUrl } from '../../services/image.service';
import { getInitials, getAvatarColor } from '../../utils/avatar.utils';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type AvatarShape = 'circle' | 'square';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  private readonly _imageId = signal<string | null>(null);
  private readonly _name    = signal('');
  private readonly _color   = signal<string | null>(null);
  private readonly _src     = signal<string | null>(null);

  @Input() set avatarId(v: string | null) { this._imageId.set(v); }

  @Input() set name(v: string)             { this._name.set(v ?? ''); }

  @Input() set color(v: string | null)     { this._color.set(v); }

  @Input() set src(v: string | null)       { this._src.set(v); }

  @Input() size: AvatarSize = 'md';
  @Input() shape: AvatarShape = 'circle';

  private readonly resolved = injectImageUrl(this._imageId);

  protected readonly displayUrl = computed(() => this._src() ?? this.resolved.url());
  protected readonly imgError   = this.resolved.error;
  protected readonly initials   = computed(() => getInitials(this._name()));
  protected readonly displayColor = computed(() => this._color() ?? getAvatarColor(this._name()));
  protected readonly altText    = computed(() => this._name());

  protected onImgError(): void {
    this.resolved.retry();
  }
}
