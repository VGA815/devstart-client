import {
  ChangeDetectionStrategy, Component, ElementRef, forwardRef, computed, input, model, signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { MarkdownPipe } from '../../pipes/markdown.pipe';

/** Порог, после которого счётчик символов начинает предупреждать. */
const COUNTER_WARN_RATIO = 0.9;

/**
 * Поле ввода Markdown: тулбар, живое превью и счётчик символов.
 *
 * Превью на десктопе показывается рядом с текстом (split), на мобайле — подменяет
 * его: узкой колонке две панели не помещаются. Textarea при этом остаётся в DOM,
 * поэтому каретка и скролл переживают переключение.
 *
 * Работает как ControlValueAccessor — подключается через `formControlName`.
 */
@Component({
  selector: 'app-markdown-editor',
  standalone: true,
  imports: [MarkdownPipe],
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MarkdownEditorComponent),
    multi: true,
  }],
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  readonly editorId = input<string>();
  readonly placeholder = input('');
  readonly minHeight = input(200);
  readonly maxLength = input<number | null>(null);
  readonly invalid = input(false);

  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('ta');

  /** Модель, а не просто сигнал: форма подключается через `formControlName`,
   *  а компоненты без ReactiveForms — через `[(value)]`. */
  readonly value = model('');
  readonly disabled = signal(false);
  readonly showPreview = signal(false);
  readonly showCheatsheet = signal(false);

  readonly counterWarn = computed(() => {
    const max = this.maxLength();
    return max !== null && this.value().length > max * COUNTER_WARN_RATIO;
  });

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    this.commit((event.target as HTMLTextAreaElement).value);
  }

  protected blur(): void {
    this.onTouched();
  }

  protected togglePreview(): void {
    this.showPreview.update(v => !v);
  }

  protected toggleCheatsheet(): void {
    this.showCheatsheet.update(v => !v);
  }

  /** Ctrl/Cmd + B / I / K — привычные сочетания, чтобы не тянуться к тулбару. */
  protected onKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;

    const key = event.key.toLowerCase();
    if (key === 'b')      { event.preventDefault(); this.wrap('**'); }
    else if (key === 'i') { event.preventDefault(); this.wrap('*'); }
    else if (key === 'k') { event.preventDefault(); this.insertLink(); }
  }

  /** Оборачивает выделение парными маркерами; повторный вызов на обёрнутом тексте снимает их. */
  protected wrap(token: string): void {
    const el = this.textarea().nativeElement;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end);

    const alreadyWrapped =
      value.slice(start - token.length, start) === token &&
      value.slice(end, end + token.length) === token;

    if (alreadyWrapped) {
      this.replaceRange(el, start - token.length, end + token.length, selected,
        start - token.length, start - token.length + selected.length);
      return;
    }

    this.replaceRange(el, start, end, token + selected + token,
      start + token.length, start + token.length + selected.length);
  }

  /**
   * Ставит префикс в начало каждой затронутой строки. Для нумерованного списка
   * номер пересчитывается по порядку, иначе получился бы «1.» на всех строках.
   */
  protected prefixLines(prefix: string, numbered = false): void {
    const el = this.textarea().nativeElement;
    const { selectionStart: start, selectionEnd: end, value } = el;

    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndRaw = value.indexOf('\n', end);
    const lineEnd = lineEndRaw === -1 ? value.length : lineEndRaw;

    const block = value.slice(lineStart, lineEnd);
    const next = block
      .split('\n')
      .map((line, i) => (numbered ? `${i + 1}. ` : prefix) + line)
      .join('\n');

    this.replaceRange(el, lineStart, lineEnd, next, lineStart, lineStart + next.length);
  }

  /** Выделение становится текстом ссылки, каретка встаёт в пустой url. */
  protected insertLink(): void {
    const el = this.textarea().nativeElement;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end) || 'текст ссылки';

    const snippet = `[${selected}](url)`;
    const urlStart = start + selected.length + 3;
    this.replaceRange(el, start, end, snippet, urlStart, urlStart + 3);
  }

  /**
   * Правка идёт через `setRangeText`, чтобы сохранить нативную историю undo:
   * перезапись `el.value` целиком её обнуляет.
   */
  private replaceRange(
    el: HTMLTextAreaElement, from: number, to: number, text: string,
    selectionStart: number, selectionEnd: number,
  ): void {
    el.focus();
    el.setRangeText(text, from, to, 'preserve');
    el.setSelectionRange(selectionStart, selectionEnd);
    this.commit(el.value);
  }

  private commit(value: string): void {
    this.value.set(value);
    this.onChange(value);
  }
}
