import {
  ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild,
} from '@angular/core';
import QRCode from 'qrcode';

/** Renders a QR code locally to a canvas — the value never leaves the browser. */
@Component({
  selector: 'app-qr-code',
  standalone: true,
  template: '<canvas #canvas class="qr-canvas"></canvas>',
  styles: [`
    :host { display: inline-block; line-height: 0; }
    .qr-canvas { border-radius: 6px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeComponent implements OnChanges {
  @Input({ required: true }) value!: string;
  @Input() size = 180;

  @ViewChild('canvas', { static: true }) private canvas!: ElementRef<HTMLCanvasElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['value'] || changes['size']) && this.value) {
      QRCode.toCanvas(this.canvas.nativeElement, this.value, {
        width: this.size,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).catch(() => { /* canvas render failed — the secret is still shown as text */ });
    }
  }
}
