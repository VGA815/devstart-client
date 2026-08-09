import { TestBed } from '@angular/core/testing';
import { DeviceTrustStore } from './device-trust.store';
import { TrustedDeviceGrantDto } from '../../shared/models/dto/auth.dto';

function grant(expiresAt: Date): TrustedDeviceGrantDto {
  return {
    deviceToken: 'a'.repeat(43),
    deviceId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    expiresAt: expiresAt.toISOString(),
  };
}

describe('DeviceTrustStore', () => {
  let store: DeviceTrustStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [DeviceTrustStore] });
    store = TestBed.inject(DeviceTrustStore);
  });

  afterEach(() => localStorage.clear());

  it('returns nothing when no device has been trusted', () => {
    expect(store.token()).toBeNull();
    expect(store.deviceId()).toBeNull();
  });

  it('round-trips a grant', () => {
    const g = grant(new Date(Date.now() + 86_400_000));
    store.save(g);

    expect(store.token()).toBe(g.deviceToken);
    expect(store.deviceId()).toBe(g.deviceId);
  });

  it('purges an expired token instead of sending it', () => {
    // The server gives no distinct "bad device token" answer, so the client must notice expiry
    // itself rather than learn it from a response.
    store.save(grant(new Date(Date.now() - 1_000)));

    expect(store.token()).toBeNull();
    expect(store.deviceId()).toBeNull();
    expect(localStorage.getItem('devstart_device_token')).toBeNull();
  });

  it('clear() removes every key', () => {
    store.save(grant(new Date(Date.now() + 86_400_000)));

    store.clear();

    expect(store.token()).toBeNull();
    expect(localStorage.getItem('devstart_device_id')).toBeNull();
    expect(localStorage.getItem('devstart_device_expires')).toBeNull();
  });
});
