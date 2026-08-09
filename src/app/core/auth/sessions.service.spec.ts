import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SessionsService } from './sessions.service';
import { DeviceTrustStore } from './device-trust.store';
import { environment } from '../../../environments/environment';

const DEVICE_ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

describe('SessionsService', () => {
  let service: SessionsService;
  let deviceTrust: DeviceTrustStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [SessionsService, DeviceTrustStore, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SessionsService);
    deviceTrust = TestBed.inject(DeviceTrustStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  function trustThisBrowser(deviceId = DEVICE_ID): void {
    deviceTrust.save({
      deviceToken: 'a'.repeat(43),
      deviceId,
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
  }

  it('revoke-all spares the current session by default', () => {
    service.revokeAllSessions().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/users/me/sessions/revoke-all`);
    expect(req.request.body).toEqual({ include_current: false });
    req.flush(null);
  });

  it('revoking this browser drops its local device token', () => {
    trustThisBrowser();

    service.revokeDevice(DEVICE_ID).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/users/me/devices/${DEVICE_ID}`).flush(null);

    expect(deviceTrust.token()).toBeNull();
  });

  it('revoking another device leaves this browser trusted', () => {
    trustThisBrowser();
    const otherId = '11111111-2222-3333-4444-555555555555';

    service.revokeDevice(otherId).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/users/me/devices/${otherId}`).flush(null);

    expect(deviceTrust.deviceId()).toBe(DEVICE_ID);
  });

  it('changing the security policy drops the local device token, since the server revokes devices', () => {
    trustThisBrowser();

    service.updateSecurity({
      strictness: 0,
      trust_duration_days: 30,
      notify_on_new_device_login: true,
    }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/users/me/security`);
    expect(req.request.method).toBe('PUT');
    req.flush(null);

    expect(deviceTrust.token()).toBeNull();
  });
});
