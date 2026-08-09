import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { MarkdownEditorComponent } from './markdown-editor.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MarkdownEditorComponent],
  template: `<app-markdown-editor [formControl]="control" [maxLength]="100" />`,
})
class HostComponent {
  readonly control = new FormControl('');
}

describe('MarkdownEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let textarea: HTMLTextAreaElement;

  /** Ставит текст и выделение так, как если бы это сделал пользователь. */
  function select(value: string, start: number, end: number): void {
    host.control.setValue(value);
    fixture.detectChanges();
    textarea.setSelectionRange(start, end);
  }

  function clickTool(title: string): void {
    const button = fixture.nativeElement.querySelector(`button[title^="${title}"]`) as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    textarea = fixture.nativeElement.querySelector('textarea');
  });

  it('should write the form value into the textarea', () => {
    host.control.setValue('# Привет');
    fixture.detectChanges();

    expect(textarea.value).toBe('# Привет');
  });

  it('should propagate typing back to the form control', () => {
    textarea.value = 'новый текст';
    textarea.dispatchEvent(new Event('input'));

    expect(host.control.value).toBe('новый текст');
  });

  it('should wrap the selection in bold markers', () => {
    select('слово', 0, 5);
    clickTool('Жирный');

    expect(host.control.value).toBe('**слово**');
  });

  it('should unwrap an already bold selection', () => {
    select('**слово**', 2, 7);
    clickTool('Жирный');

    expect(host.control.value).toBe('слово');
  });

  it('should prefix every selected line for a bullet list', () => {
    select('раз\nдва', 0, 7);
    clickTool('Маркированный список');

    expect(host.control.value).toBe('- раз\n- два');
  });

  it('should number the lines of an ordered list in sequence', () => {
    select('раз\nдва\nтри', 0, 11);
    clickTool('Нумерованный список');

    expect(host.control.value).toBe('1. раз\n2. два\n3. три');
  });

  it('should turn the selection into a link and put the caret in the url', () => {
    select('DevStart', 0, 8);
    clickTool('Ссылка');

    expect(host.control.value).toBe('[DevStart](url)');
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('url');
  });

  it('should render a preview only after the toggle is pressed', () => {
    host.control.setValue('**жирный**');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.md-editor__preview')).toBeNull();

    clickTool('Показать превью');

    const preview = fixture.nativeElement.querySelector('.md-editor__preview-body');
    expect(preview.innerHTML).toContain('<strong>жирный</strong>');
  });

  it('should expose the character limit to the user', () => {
    host.control.setValue('12345');
    fixture.detectChanges();

    const counter = fixture.nativeElement.querySelector('.md-editor__counter');
    expect(counter.textContent.replace(/\s+/g, ' ').trim()).toBe('5 / 100');
    expect(textarea.getAttribute('maxlength')).toBe('100');
  });

  it('should disable the textarea when the control is disabled', () => {
    host.control.disable();
    fixture.detectChanges();

    expect(textarea.disabled).toBeTrue();
  });
});
