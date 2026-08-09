import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { MarkdownPipe } from './markdown.pipe';

/** Пайп отдаёт SafeHtml — для проверок разворачиваем обратно в строку. */
function render(pipe: MarkdownPipe, sanitizer: DomSanitizer, md: string): string {
  return sanitizer.sanitize(1 /* SecurityContext.HTML */, pipe.transform(md)) ?? '';
}

describe('MarkdownPipe', () => {
  let pipe: MarkdownPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [MarkdownPipe] });
    pipe = TestBed.inject(MarkdownPipe);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  it('should render basic markdown', () => {
    const html = render(pipe, sanitizer, '## Заголовок\n\n**жирный** и *курсив*');

    expect(html).toContain('<h2');
    expect(html).toContain('<strong>жирный</strong>');
    expect(html).toContain('<em>курсив</em>');
  });

  it('should return empty string for null and undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  // Описание стартапа и документы сообщества пишут пользователи — сырой HTML
  // из них попадает на публичную страницу, поэтому санитизация обязательна.
  it('should strip script tags from user content', () => {
    const html = render(pipe, sanitizer, 'текст<script>alert(1)</script>');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('should strip event handlers from inline html', () => {
    const html = render(pipe, sanitizer, '<img src="x" onerror="alert(1)">');

    expect(html).not.toContain('onerror');
  });

  it('should strip svg onload payloads', () => {
    const html = render(pipe, sanitizer, '<svg onload="alert(1)"></svg>');

    expect(html).not.toContain('onload');
    expect(html).not.toContain('<svg');
  });

  it('should drop javascript: links', () => {
    const html = render(pipe, sanitizer, '[клик](javascript:alert(1))');

    expect(html).not.toContain('javascript:');
  });

  it('should not let user content borrow design-system classes', () => {
    const html = render(pipe, sanitizer, '<div class="page">чужой класс</div>');

    expect(html).not.toContain('class="page"');
  });

  it('should open external links in a new tab with rel protection', () => {
    const html = render(pipe, sanitizer, '[сайт](https://example.com)');

    expect(html).toContain('target="_blank"');
    expect(html).toContain('noopener');
  });

  it('should keep same-origin links in the current tab', () => {
    const html = render(pipe, sanitizer, `[каталог](${location.origin}/startups)`);

    expect(html).not.toContain('target="_blank"');
  });

  it('should keep relative links in the current tab', () => {
    const html = render(pipe, sanitizer, '[каталог](/startups)');

    expect(html).not.toContain('target="_blank"');
  });

  it('should keep gfm table alignment used by term sheet styles', () => {
    const html = render(
      pipe, sanitizer,
      '| Условие | Сумма |\n| --- | ---: |\n| Раунд | 10 |',
    );

    expect(html).toContain('<table>');
    expect(html).toContain('align="right"');
  });
});
