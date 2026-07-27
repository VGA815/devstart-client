import {
  AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter,
  HostListener, Input, OnDestroy, Output, ViewChild, computed, signal,
} from '@angular/core';
import { AvatarShape } from '../avatar/avatar.component';
import {
  MAX_ZOOM_FACTOR, clampOffset, cropToFile, minCoverScale, offsetAfterZoom, toCropRect,
} from '../../utils/image-crop.utils';

/** Шаг зума колесом мыши. */
const WHEEL_STEP = 1.12;
/** Шаг зума кнопками «−»/«+» и клавиатурой. */
const BUTTON_STEP = 1.2;
/** Сдвиг стрелками, CSS-пиксели. */
const KEY_PAN = 16;
const KEY_PAN_FINE = 4;
/** Позиций у ползунка масштаба. */
const SLIDER_STEPS = 100;

interface PointerSnapshot {
  x: number;
  y: number;
}

/**
 * Модалка кадрирования: перетаскивание, зум колесом/щипком/ползунком,
 * на выходе — готовый квадратный `File`.
 */
@Component({
  selector: 'app-avatar-editor',
  standalone: true,
  imports: [],
  templateUrl: './avatar-editor.component.html',
  styleUrl: './avatar-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarEditorComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) file!: File;
  @Input() shape: AvatarShape = 'square';

  /** Обрезанное изображение, готовое к загрузке. */
  @Output() apply = new EventEmitter<File>();
  @Output() dismiss = new EventEmitter<void>();

  @ViewChild('frame', { static: true }) private frameRef!: ElementRef<HTMLElement>;
  @ViewChild('image', { static: true }) private imageRef!: ElementRef<HTMLImageElement>;

  protected readonly source     = signal<string | null>(null);
  protected readonly processing = signal(false);
  protected readonly error      = signal<string | null>(null);

  private readonly naturalW = signal(0);
  private readonly naturalH = signal(0);
  private readonly frame    = signal(0);

  private readonly scale   = signal(1);
  private readonly offsetX = signal(0);
  private readonly offsetY = signal(0);

  protected readonly ready = computed(() => this.naturalW() > 0 && this.frame() > 0);

  protected readonly minScale = computed(() => minCoverScale(this.naturalW(), this.naturalH(), this.frame()));
  protected readonly maxScale = computed(() => this.minScale() * MAX_ZOOM_FACTOR);

  /** `transform-origin: 0 0` + translate/scale — та же геометрия, что и у `toCropRect`. */
  protected readonly transform = computed(() => {
    const left = (this.frame() - this.naturalW() * this.scale()) / 2 + this.offsetX();
    const top  = (this.frame() - this.naturalH() * this.scale()) / 2 + this.offsetY();
    return `translate3d(${left}px, ${top}px, 0) scale(${this.scale()})`;
  });

  /** Положение ползунка, 0…SLIDER_STEPS. */
  protected readonly sliderValue = computed(() => {
    const span = this.maxScale() - this.minScale();
    if (span <= 0) return 0;
    return Math.round(((this.scale() - this.minScale()) / span) * SLIDER_STEPS);
  });

  protected readonly sliderMax = SLIDER_STEPS;

  protected readonly atMinZoom = computed(() => this.scale() <= this.minScale() + 0.0001);
  protected readonly canReset  = computed(() => !this.atMinZoom() || this.offsetX() !== 0 || this.offsetY() !== 0);

  private readonly pointers = new Map<number, PointerSnapshot>();
  private pinchDistance = 0;
  private observer?: ResizeObserver;
  private reader?: FileReader;

  ngAfterViewInit(): void {
    this.observeFrame();
    this.readFile();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.reader?.abort();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.processing()) this.dismiss.emit();
  }

  private readFile(): void {
    const reader = new FileReader();
    this.reader = reader;
    reader.onload  = () => this.source.set(reader.result as string);
    reader.onerror = () => this.error.set('Не удалось прочитать файл');
    reader.readAsDataURL(this.file);
  }

  private observeFrame(): void {
    const el = this.frameRef.nativeElement;
    this.observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width ?? el.clientWidth;
      if (next > 0) this.syncFrame(next);
    });
    this.observer.observe(el);
    if (el.clientWidth > 0) this.syncFrame(el.clientWidth);
  }

  /** Рамка изменила размер — сохраняем ту же видимую область. */
  private syncFrame(next: number): void {
    const prev = this.frame();
    this.frame.set(next);

    if (!this.naturalW()) return;
    if (!prev) { this.reset(); return; }

    const ratio = next / prev;
    this.scale.set(this.scale() * ratio);
    this.offsetX.set(this.offsetX() * ratio);
    this.offsetY.set(this.offsetY() * ratio);
    this.clampPosition();
  }

  protected onImageLoad(): void {
    const img = this.imageRef.nativeElement;
    if (!img.naturalWidth || !img.naturalHeight) {
      this.error.set('Не удалось открыть изображение');
      return;
    }
    this.naturalW.set(img.naturalWidth);
    this.naturalH.set(img.naturalHeight);
    if (this.frame() > 0) this.reset();
  }

  protected onImageError(): void {
    this.error.set('Не удалось открыть изображение');
  }

  protected reset(): void {
    this.scale.set(this.minScale());
    this.offsetX.set(0);
    this.offsetY.set(0);
  }

  // ── Жесты ──────────────────────────────────────────────────────

  protected onPointerDown(event: PointerEvent): void {
    if (!this.ready()) return;
    this.frameRef.nativeElement.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) this.pinchDistance = this.currentPinchDistance();
  }

  protected onPointerMove(event: PointerEvent): void {
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;

    const current: PointerSnapshot = { x: event.clientX, y: event.clientY };

    if (this.pointers.size >= 2) {
      this.pointers.set(event.pointerId, current);
      this.handlePinch();
      return;
    }

    this.pointers.set(event.pointerId, current);
    this.pan(current.x - previous.x, current.y - previous.y);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    this.pinchDistance = 0;
    const el = this.frameRef.nativeElement;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
  }

  private handlePinch(): void {
    const distance = this.currentPinchDistance();
    if (!this.pinchDistance || !distance) {
      this.pinchDistance = distance;
      return;
    }
    const [a, b] = [...this.pointers.values()];
    const rect = this.frameRef.nativeElement.getBoundingClientRect();
    this.zoomAt(
      this.scale() * (distance / this.pinchDistance),
      (a.x + b.x) / 2 - rect.left,
      (a.y + b.y) / 2 - rect.top,
    );
    this.pinchDistance = distance;
  }

  private currentPinchDistance(): number {
    const [a, b] = [...this.pointers.values()];
    if (!a || !b) return 0;
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  protected onWheel(event: WheelEvent): void {
    if (!this.ready()) return;
    event.preventDefault();
    const rect = this.frameRef.nativeElement.getBoundingClientRect();
    const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
    this.zoomAt(this.scale() * factor, event.clientX - rect.left, event.clientY - rect.top);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.ready()) return;
    const step = event.shiftKey ? KEY_PAN_FINE : KEY_PAN;

    switch (event.key) {
      case 'ArrowLeft':  this.pan(step, 0); break;
      case 'ArrowRight': this.pan(-step, 0); break;
      case 'ArrowUp':    this.pan(0, step); break;
      case 'ArrowDown':  this.pan(0, -step); break;
      case '+':
      case '=':          this.zoomBy(BUTTON_STEP); break;
      case '-':
      case '_':          this.zoomBy(1 / BUTTON_STEP); break;
      default: return;
    }
    event.preventDefault();
  }

  protected zoomIn(): void  { this.zoomBy(BUTTON_STEP); }
  protected zoomOut(): void { this.zoomBy(1 / BUTTON_STEP); }

  private zoomBy(factor: number): void {
    const centre = this.frame() / 2;
    this.zoomAt(this.scale() * factor, centre, centre);
  }

  protected onSliderInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const next = this.minScale() + (this.maxScale() - this.minScale()) * (raw / SLIDER_STEPS);
    const centre = this.frame() / 2;
    this.zoomAt(next, centre, centre);
  }

  private pan(dx: number, dy: number): void {
    this.offsetX.set(clampOffset(this.offsetX() + dx, this.naturalW(), this.scale(), this.frame()));
    this.offsetY.set(clampOffset(this.offsetY() + dy, this.naturalH(), this.scale(), this.frame()));
  }

  private zoomAt(next: number, anchorX: number, anchorY: number): void {
    const scale = Math.min(this.maxScale(), Math.max(this.minScale(), next));
    if (scale === this.scale()) return;

    const frame = this.frame();
    this.offsetX.set(offsetAfterZoom(this.naturalW(), anchorX, this.offsetX(), frame, this.scale(), scale));
    this.offsetY.set(offsetAfterZoom(this.naturalH(), anchorY, this.offsetY(), frame, this.scale(), scale));
    this.scale.set(scale);
  }

  private clampPosition(): void {
    const scale = Math.min(this.maxScale(), Math.max(this.minScale(), this.scale()));
    this.scale.set(scale);
    this.offsetX.set(clampOffset(this.offsetX(), this.naturalW(), scale, this.frame()));
    this.offsetY.set(clampOffset(this.offsetY(), this.naturalH(), scale, this.frame()));
  }

  // ── Сохранение ─────────────────────────────────────────────────

  protected async save(): Promise<void> {
    if (!this.ready() || this.processing()) return;

    this.processing.set(true);
    this.error.set(null);
    try {
      const crop = toCropRect(this.naturalW(), this.naturalH(), {
        frame:   this.frame(),
        scale:   this.scale(),
        offsetX: this.offsetX(),
        offsetY: this.offsetY(),
      });
      this.apply.emit(await cropToFile(this.imageRef.nativeElement, crop, this.file.name));
    } catch {
      this.error.set('Не удалось обработать изображение. Попробуйте другой файл.');
    } finally {
      this.processing.set(false);
    }
  }
}
