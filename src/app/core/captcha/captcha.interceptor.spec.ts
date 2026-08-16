import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { CAPTCHA_HEADER, captchaInterceptor } from './captcha.interceptor';
import { CaptchaService } from './captcha.service';

describe('captchaInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let executeCalls: number;

  /** Stands in for the real widget: hands back a predictable single-use token. */
  function configure(enabled: boolean): void {
    executeCalls = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([captchaInterceptor])),
        provideHttpClientTesting(),
        {
          provide: CaptchaService,
          useValue: {
            enabled,
            execute: () => Promise.resolve(enabled ? `token-${++executeCalls}` : null),
          },
        },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  }

  afterEach(() => controller.verify());

  it('attaches a token to every protected endpoint', async () => {
    configure(true);

    const protectedUrls = [
      '/api/users/register',
      '/api/users/login',
      '/api/users/forgot-password',
      '/api/users/reset-password',
      '/api/email-verification/resend?email=a%40b.c',
      '/api/auth/2fa/verify',
      '/api/auth/2fa/setup',
      '/api/auth/2fa/setup/confirm',
      '/api/auth/oauth/complete',
      '/api/auth/oauth/google/start',
    ];

    for (const url of protectedUrls) {
      http.post(url, {}).subscribe();
      // execute() is async, so the request is only issued after the promise settles.
      await Promise.resolve();
      await Promise.resolve();

      const req = controller.expectOne(url);
      expect(req.request.headers.get(CAPTCHA_HEADER)).withContext(url).toBeTruthy();
      req.flush({});
    }
  });

  it('does not attach a token to the authenticated OAuth link flow', () => {
    // The regex uses [^/]+ precisely so .../google/link/start does not match. Breaking this breaks
    // the only OAuth path that is actually reachable in the product today.
    configure(true);

    http.post('/api/auth/oauth/google/link/start', {}).subscribe();

    const req = controller.expectOne('/api/auth/oauth/google/link/start');
    expect(req.request.headers.has(CAPTCHA_HEADER)).toBe(false);
    req.flush({});
  });

  it('leaves unrelated endpoints alone', () => {
    configure(true);

    http.get('/api/startups').subscribe();

    const req = controller.expectOne('/api/startups');
    expect(req.request.headers.has(CAPTCHA_HEADER)).toBe(false);
    req.flush({});
  });

  it('passes through untouched when the captcha is disabled', () => {
    configure(false);

    http.post('/api/users/login', {}).subscribe();

    const req = controller.expectOne('/api/users/login');
    expect(req.request.headers.has(CAPTCHA_HEADER)).toBe(false);
    expect(executeCalls).toBe(0);
    req.flush({});
  });

  it('mints a distinct token per request, since tokens are single-use', async () => {
    configure(true);

    http.post('/api/users/register', {}).subscribe();
    await Promise.resolve();
    await Promise.resolve();
    const first = controller.expectOne('/api/users/register');
    first.flush({});

    http.post('/api/users/login', {}).subscribe();
    await Promise.resolve();
    await Promise.resolve();
    const second = controller.expectOne('/api/users/login');

    expect(second.request.headers.get(CAPTCHA_HEADER))
      .not.toBe(first.request.headers.get(CAPTCHA_HEADER));
    second.flush({});
  });
});
