import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { DeviceTrustStore } from './device-trust.store';
import { environment } from '../../../environments/environment';

// A JWT-shaped token whose base64url payload decodes to the given claims.
function makeJwt(payload: object): string {
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `h.${b64}.s`;
}

describe('AuthService — password flows', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('forgotPassword POSTs the email to /users/forgot-password', () => {
    service.forgotPassword('user@example.com').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/users/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@example.com' });
    req.flush(null);
  });

  it('resetPassword POSTs token + snake_case new_password', () => {
    service.resetPassword('tok-123', 'secret123').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/users/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok-123', new_password: 'secret123' });
    req.flush(null);
  });

  it('changePassword POSTs snake_case current_password + new_password', () => {
    service.changePassword('oldpass12', 'newpass12').subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/users/change-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ current_password: 'oldpass12', new_password: 'newpass12' });
    req.flush(null);
  });
});

describe('AuthService — consent challenge', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('login resolves to "authenticated" when the envelope carries tokens', () => {
    const accessToken = makeJwt({ sub: 'user-1' });
    let outcome: { kind: string } | undefined;
    service.login({ email: 'a@b.co', password: 'secret123' }).subscribe(o => (outcome = o));

    httpMock.expectOne(`${environment.apiUrl}/users/login`)
      .flush({ tokens: { accessToken, refreshToken: 'r', expiresIn: 3600 }, consent: null });

    // completeSession then loads the user
    httpMock.expectOne(`${environment.apiUrl}/users/user-1`)
      .flush({ id: 'user-1', email: 'a@b.co', username: 'a', isVerified: true });

    expect(outcome?.kind).toBe('authenticated');
    expect(service.pendingChallenge()).toBeNull();
  });

  it('login surfaces a consent challenge and stores the pending token', () => {
    let outcome: { kind: string } | undefined;
    service.login({ email: 'a@b.co', password: 'secret123' }).subscribe(o => (outcome = o));

    httpMock.expectOne(`${environment.apiUrl}/users/login`).flush({
      tokens: null,
      consent: { pendingToken: 'pending-xyz', required: [{ type: 1, documentVersion: '2.0' }] },
    });

    expect(outcome?.kind).toBe('consent');
    expect(service.pendingChallenge()?.pendingToken).toBe('pending-xyz');
  });

  it('completeConsent POSTs snake_case pending_token + consents and clears the challenge', () => {
    // seed a pending challenge
    service.login({ email: 'a@b.co', password: 'secret123' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/users/login`).flush({
      tokens: null,
      consent: { pendingToken: 'pending-xyz', required: [{ type: 1, documentVersion: '2.0' }] },
    });

    const accessToken = makeJwt({ sub: 'user-1' });
    service.completeConsent([{ type: 1, document_version: '2.0', accepted: true }]).subscribe();

    const complete = httpMock.expectOne(`${environment.apiUrl}/auth/oauth/complete`);
    expect(complete.request.method).toBe('POST');
    expect(complete.request.body).toEqual({
      pending_token: 'pending-xyz',
      consents: [{ type: 1, document_version: '2.0', accepted: true }],
    });
    complete.flush({ tokens: { accessToken, refreshToken: 'r', expiresIn: 3600 }, consent: null });

    httpMock.expectOne(`${environment.apiUrl}/users/user-1`)
      .flush({ id: 'user-1', email: 'a@b.co', username: 'a', isVerified: true });

    expect(service.pendingChallenge()).toBeNull();
  });
});

describe('AuthService — trusted device', () => {
  let service: AuthService;
  let deviceTrust: DeviceTrustStore;
  let httpMock: HttpTestingController;

  const grant = {
    deviceToken: 'd'.repeat(43),
    deviceId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        DeviceTrustStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(AuthService);
    deviceTrust = TestBed.inject(DeviceTrustStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('login sends a null device_token when this browser is not trusted', () => {
    service.login({ email: 'a@b.co', password: 'secret123' }).subscribe({ error: () => {} });

    const req = httpMock.expectOne(`${environment.apiUrl}/users/login`);
    expect(req.request.body.device_token).toBeNull();
    req.flush({ tokens: null, consent: null, twoFactor: { pendingToken: 'p' } });
  });

  it('login sends the stored device token so the server can skip the code', () => {
    deviceTrust.save(grant);

    service.login({ email: 'a@b.co', password: 'secret123' }).subscribe({ error: () => {} });

    const req = httpMock.expectOne(`${environment.apiUrl}/users/login`);
    expect(req.request.body.device_token).toBe(grant.deviceToken);
    req.flush({ tokens: null, consent: null, twoFactor: { pendingToken: 'p' } });
  });

  it('verifyTwoFactor forwards remember_device and stores the returned grant', () => {
    // seed a 2FA challenge
    service.login({ email: 'a@b.co', password: 'secret123' }).subscribe({ error: () => {} });
    httpMock.expectOne(`${environment.apiUrl}/users/login`)
      .flush({ tokens: null, consent: null, twoFactor: { pendingToken: 'pending-2fa' } });

    const accessToken = makeJwt({ sub: 'user-1' });
    service.verifyTwoFactor('123456', true).subscribe();

    const verify = httpMock.expectOne(`${environment.apiUrl}/auth/2fa/verify`);
    expect(verify.request.body).toEqual({
      pending_token: 'pending-2fa',
      code: '123456',
      remember_device: true,
    });
    verify.flush({
      tokens: { accessToken, refreshToken: 'r', expiresIn: 3600 },
      consent: null,
      trustedDevice: grant,
    });

    httpMock.expectOne(`${environment.apiUrl}/users/user-1`)
      .flush({ id: 'user-1', email: 'a@b.co', username: 'a', isVerified: true });

    expect(deviceTrust.token()).toBe(grant.deviceToken);
    expect(deviceTrust.deviceId()).toBe(grant.deviceId);
  });

  it('stores the grant even when a consent challenge follows the code', () => {
    // The second factor is proven either way, so the browser is trusted on both branches.
    service.login({ email: 'a@b.co', password: 'secret123' }).subscribe({ error: () => {} });
    httpMock.expectOne(`${environment.apiUrl}/users/login`)
      .flush({ tokens: null, consent: null, twoFactor: { pendingToken: 'pending-2fa' } });

    service.verifyTwoFactor('123456', true).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/2fa/verify`).flush({
      tokens: null,
      consent: { pendingToken: 'pending-consent', required: [] },
      trustedDevice: grant,
    });

    expect(deviceTrust.token()).toBe(grant.deviceToken);
  });

  it('logout keeps the trusted device — that is the point of remembering it', () => {
    deviceTrust.save(grant);
    localStorage.setItem('devstart_refresh', 'refresh-token');

    service.logout();
    httpMock.expectOne(`${environment.apiUrl}/auth/logout`).flush(null);

    expect(deviceTrust.token()).toBe(grant.deviceToken);
  });
});
