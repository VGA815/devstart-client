/**
 * Математика и рендеринг квадратного кадрирования аватарок.
 * Геометрия вынесена в чистые функции — она покрыта юнит-тестами,
 * компонент отвечает только за жесты и разметку.
 */

/** Сторона итогового изображения, которое уходит на бэкенд. */
export const AVATAR_OUTPUT_SIZE = 512;

/** Во сколько раз можно приблизить изображение относительно «вписанного» масштаба. */
export const MAX_ZOOM_FACTOR = 5;

const OUTPUT_QUALITY = 0.9;

/** JPEG не поддерживает альфу — прозрачные области иначе станут чёрными. */
const JPEG_BACKDROP = '#ffffff';

/** Область исходника в его натуральных пикселях. */
export interface CropRect {
  x: number;
  y: number;
  /** Сторона квадрата. */
  size: number;
}

/** Положение изображения внутри квадратной рамки кадрирования (CSS-пиксели). */
export interface CropView {
  /** Сторона рамки. */
  frame: number;
  /** Множитель «натуральные пиксели → CSS-пиксели». */
  scale: number;
  /** Смещение центра изображения от центра рамки. */
  offsetX: number;
  offsetY: number;
}

/** Минимальный масштаб, при котором изображение всё ещё перекрывает рамку целиком. */
export function minCoverScale(naturalW: number, naturalH: number, frame: number): number {
  const shortSide = Math.min(naturalW, naturalH);
  if (shortSide <= 0 || frame <= 0) return 1;
  return frame / shortSide;
}

/** Максимальное смещение по оси, при котором рамка остаётся полностью закрытой. */
export function maxOffset(natural: number, scale: number, frame: number): number {
  return Math.max(0, (natural * scale - frame) / 2);
}

/** Ограничивает смещение так, чтобы в рамке не появилось пустоты. */
export function clampOffset(value: number, natural: number, scale: number, frame: number): number {
  const limit = maxOffset(natural, scale, frame);
  return Math.min(limit, Math.max(-limit, value));
}

/** `-0` ломает сравнения на равенство у вызывающего кода. */
function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

/** Переводит положение изображения в рамке в область исходника. */
export function toCropRect(naturalW: number, naturalH: number, view: CropView): CropRect {
  const { frame, scale, offsetX, offsetY } = view;
  const left = (frame - naturalW * scale) / 2 + offsetX;
  const top  = (frame - naturalH * scale) / 2 + offsetY;
  return {
    x: normalizeZero(-left / scale),
    y: normalizeZero(-top / scale),
    size: frame / scale,
  };
}

/**
 * Новое смещение после смены масштаба с фиксацией точки под курсором/пальцами.
 * `anchor` — координаты внутри рамки, которые должны остаться на месте.
 */
export function offsetAfterZoom(
  natural: number, anchor: number, offset: number, frame: number, scale: number, nextScale: number,
): number {
  const left = (frame - natural * scale) / 2 + offset;
  const imagePoint = (anchor - left) / scale;
  const nextLeft = anchor - nextScale * imagePoint;
  return clampOffset(nextLeft - (frame - natural * nextScale) / 2, natural, nextScale, frame);
}

let webpSupported: boolean | null = null;

/** Safari < 14 и старые Android WebView не умеют кодировать WebP. */
export function supportsWebp(): boolean {
  if (webpSupported === null) {
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    webpSupported = probe.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupported;
}

function renderCrop(
  source: CanvasImageSource, crop: CropRect, outputSize: number, backdrop: string | null,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = outputSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (backdrop) {
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, outputSize, outputSize);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, crop.x, crop.y, crop.size, crop.size, 0, 0, outputSize, outputSize);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Canvas encoding failed')),
      type,
      quality,
    );
  });
}

/** Имя файла для загрузки: ASCII, без расширения исходника. */
export function avatarFileName(originalName: string, extension: string): string {
  const stem = originalName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${stem || 'avatar'}.${extension}`;
}

/** Вырезает квадрат, масштабирует до `outputSize` и упаковывает в `File` для загрузки. */
export async function cropToFile(
  source: CanvasImageSource,
  crop: CropRect,
  originalName: string,
  outputSize = AVATAR_OUTPUT_SIZE,
): Promise<File> {
  if (!(crop.size > 0)) throw new Error('Empty crop rect');

  const webp = supportsWebp();
  const type = webp ? 'image/webp' : 'image/jpeg';
  const canvas = renderCrop(source, crop, outputSize, webp ? null : JPEG_BACKDROP);
  const blob = await canvasToBlob(canvas, type, OUTPUT_QUALITY);

  return new File([blob], avatarFileName(originalName, webp ? 'webp' : 'jpg'), { type });
}
