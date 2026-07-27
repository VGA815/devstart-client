import {
  Component, ChangeDetectionStrategy, Input, Output, EventEmitter,
  ViewChild, ElementRef, inject, signal, computed,
} from '@angular/core';
import { ImageService, injectImageUrl } from '../../services/image.service';
import { AuthService } from '../../../core/auth/auth.service';
import { getInitials } from '../../utils/avatar.utils';
import { AvatarShape } from '../avatar/avatar.component';
import { AvatarEditorComponent } from '../avatar-editor/avatar-editor.component';

@Component({
  selector: 'app-avatar-upload',
  standalone: true,
  imports: [AvatarEditorComponent],
  templateUrl: './avatar-upload.component.html',
  styleUrl: './avatar-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarUploadComponent {
  private readonly imageSvc = inject(ImageService);
  private readonly auth     = inject(AuthService);

  private readonly _name = signal('');


  readonly currentImageId = signal<string | null>(null);


  readonly localPreview = signal<string | null>(null);


  readonly pendingFile = signal<File | null>(null);

  readonly uploading   = signal(false);
  readonly uploadError = signal<string | null>(null);


  private readonly resolved = injectImageUrl(this.currentImageId);

  readonly displayUrl = computed(() => this.localPreview() ?? this.resolved.url());
  readonly initials   = computed(() => getInitials(this._name()));

  @Output() avatarIdChange = new EventEmitter<string | null>();
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;


  @Input() set avatarId(v: string | null) {
    if (v !== this.currentImageId()) this.currentImageId.set(v);
  }
  @Input() set name(v: string) { this._name.set(v ?? ''); }


  @Input() shape: AvatarShape = 'square';

  openFilePicker(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadError.set(null);

    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Допустимы только изображения (JPEG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('Файл не должен превышать 5 МБ');
      return;
    }

    this.pendingFile.set(file);
  }


  onEditorApply(cropped: File): void {
    this.pendingFile.set(null);

    const reader = new FileReader();
    reader.onload = e => this.localPreview.set(e.target?.result as string);
    reader.readAsDataURL(cropped);

    this.upload(cropped);
  }

  onEditorDismiss(): void {
    this.pendingFile.set(null);
  }

  private upload(file: File): void {
    const ownerId = this.auth.user()?.id;
    if (!ownerId) {
      this.localPreview.set(null);
      this.uploadError.set('Необходима авторизация');
      return;
    }

    this.uploading.set(true);
    this.imageSvc.upload(file, ownerId).subscribe({
      next: newId => {
        this.currentImageId.set(newId);
        this.localPreview.set(null);
        this.uploading.set(false);
        this.avatarIdChange.emit(newId);
      },
      error: () => {
        this.uploading.set(false);
        this.localPreview.set(null);
        this.uploadError.set('Ошибка загрузки. Попробуйте снова.');
      },
    });
  }

  onImgError(): void {
    this.resolved.retry();
  }

  remove(): void {
    this.currentImageId.set(null);
    this.localPreview.set(null);
    this.uploadError.set(null);
    this.avatarIdChange.emit(null);
  }
}
