import {
  avatarFileName, clampOffset, maxOffset, minCoverScale, offsetAfterZoom, toCropRect,
} from './image-crop.utils';

const FRAME = 300;

describe('minCoverScale', () => {
  it('вписывает короткую сторону в рамку', () => {
    expect(minCoverScale(1200, 600, FRAME)).toBe(0.5);
    expect(minCoverScale(600, 1200, FRAME)).toBe(0.5);
  });

  it('увеличивает изображение мельче рамки', () => {
    expect(minCoverScale(150, 150, FRAME)).toBe(2);
  });

  it('не делит на ноль, пока размеры неизвестны', () => {
    expect(minCoverScale(0, 0, FRAME)).toBe(1);
    expect(minCoverScale(1200, 600, 0)).toBe(1);
  });
});

describe('clampOffset', () => {
  it('не даёт увести изображение так, чтобы в рамке появилась пустота', () => {
    // 1200 × 0.5 = 600 CSS-пикселей при рамке 300 → запас 150 в каждую сторону
    expect(maxOffset(1200, 0.5, FRAME)).toBe(150);
    expect(clampOffset(400, 1200, 0.5, FRAME)).toBe(150);
    expect(clampOffset(-400, 1200, 0.5, FRAME)).toBe(-150);
    expect(clampOffset(80, 1200, 0.5, FRAME)).toBe(80);
  });

  it('фиксирует ось, по которой изображение ровно перекрывает рамку', () => {
    expect(clampOffset(50, 600, 0.5, FRAME)).toBe(0);
  });
});

describe('toCropRect', () => {
  it('по центру берёт квадрат по короткой стороне', () => {
    const crop = toCropRect(1200, 600, { frame: FRAME, scale: 0.5, offsetX: 0, offsetY: 0 });

    expect(crop).toEqual({ x: 300, y: 0, size: 600 });
  });

  it('сдвиг вправо смещает окно кадрирования влево по исходнику', () => {
    const crop = toCropRect(1200, 600, { frame: FRAME, scale: 0.5, offsetX: 150, offsetY: 0 });

    expect(crop).toEqual({ x: 0, y: 0, size: 600 });
  });

  it('приближение уменьшает область исходника', () => {
    const crop = toCropRect(1200, 600, { frame: FRAME, scale: 1, offsetX: 0, offsetY: 0 });

    expect(crop).toEqual({ x: 450, y: 150, size: 300 });
  });
});

describe('offsetAfterZoom', () => {
  it('оставляет точку под курсором на месте', () => {
    const natural = 1200;
    const scale = 0.5;
    const nextScale = 1;
    const anchor = 60;
    const offset = 0;

    const nextOffset = offsetAfterZoom(natural, anchor, offset, FRAME, scale, nextScale);

    const pointBefore = (anchor - ((FRAME - natural * scale) / 2 + offset)) / scale;
    const pointAfter  = (anchor - ((FRAME - natural * nextScale) / 2 + nextOffset)) / nextScale;
    expect(pointAfter).toBeCloseTo(pointBefore, 6);
  });

  it('не выпускает изображение за пределы рамки при зуме у края', () => {
    const nextOffset = offsetAfterZoom(1200, 0, 150, FRAME, 0.5, 0.26);

    expect(Math.abs(nextOffset)).toBeLessThanOrEqual(maxOffset(1200, 0.26, FRAME));
  });
});

describe('avatarFileName', () => {
  it('меняет расширение и чистит имя до ASCII', () => {
    expect(avatarFileName('photo 2026.PNG', 'webp')).toBe('photo-2026.webp');
  });

  it('подставляет запасное имя, если от исходного ничего не осталось', () => {
    expect(avatarFileName('аватарка.jpeg', 'jpg')).toBe('avatar.jpg');
  });
});
