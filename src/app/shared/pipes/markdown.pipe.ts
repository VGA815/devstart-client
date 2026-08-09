import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: false });

/**
 * Разрешённый вывод: то, что умеет отдавать marked (+ чекбоксы GFM task-list).
 * `class`/`style`/`id` намеренно не пропускаем — пользовательский текст не должен
 * цеплять классы дизайн-системы и ломать вёрстку страницы.
 */
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'blockquote', 'pre', 'code',
  'ul', 'ol', 'li',
  'strong', 'em', 'del', 's', 'sub', 'sup',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'input', 'span',
];

const ALLOWED_ATTR = [
  'href', 'title', 'src', 'alt', 'width', 'height',
  'align', 'colspan', 'rowspan', 'start',
  'type', 'checked', 'disabled',
];

/**
 * Внешние ссылки открываем в новой вкладке: markdown-документ читают внутри SPA,
 * и уход по ссылке из формы согласий/редактора терял бы несохранённое состояние.
 */
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName !== 'A') return;

  const href = node.getAttribute('href');
  if (!href) return;

  const isExternal = /^https?:\/\//i.test(href) && !href.startsWith(location.origin);
  if (isExternal) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    const html = marked.parse(value, { async: false }) as string;
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ADD_ATTR: ['target', 'rel'],
    });

    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
