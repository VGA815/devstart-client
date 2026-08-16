import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CaptchaService } from './captcha.service';
import { UserPreferencesService } from '../preferences/user-preferences.service';
import { environment } from '../../../environments/environment';

describe('CaptchaService', () => {
  function injectedScripts(): HTMLScriptElement[] {
    return Array.from(document.head.querySelectorAll<HTMLScriptElement>('script[src*="captcha.js"]'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: UserPreferencesService, useValue: { effective: signal<'dark' | 'light'>('dark') } },
      ],
    });
  });

  afterEach(() => {
    injectedScripts().forEach(s => s.remove());
    document.getElementById('ds-captcha')?.remove();
  });

  // captchaSiteKey is '' in both environment files, which is the shipped default for `ng serve`,
  // unit tests and a plain `ng build`. The service must be inert in that state.
  it('is disabled when no site key is configured', () => {
    expect(environment.captchaSiteKey).toBe('');
    expect(TestBed.inject(CaptchaService).enabled).toBe(false);
  });

  it('resolves execute() to null without touching the DOM when disabled', async () => {
    const service = TestBed.inject(CaptchaService);

    await expectAsync(service.execute()).toBeResolvedTo(null);

    expect(injectedScripts().length).toBe(0);
    expect(document.getElementById('ds-captcha')).toBeNull();
    expect(service.ready()).toBe(false);
  });

  it('stays inert across repeated calls when disabled', async () => {
    const service = TestBed.inject(CaptchaService);

    const tokens = await Promise.all([service.execute(), service.execute(), service.execute()]);

    expect(tokens).toEqual([null, null, null]);
    expect(injectedScripts().length).toBe(0);
  });
});
