import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

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
