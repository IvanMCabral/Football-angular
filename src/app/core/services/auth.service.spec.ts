// Regression coverage for AuthService request payload hygiene.

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthResponse } from '../../shared/models/auth.model';

describe('AuthService payload hygiene', () => {
  let service: AuthService;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  const fakeResponse: AuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 86400,
    tokenType: 'Bearer',
  };

  beforeEach(() => {
    // Clear localStorage so AuthService's constructor (tryRestoreSession) is a no-op.
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    httpSpy = jasmine.createSpyObj('HttpClient', ['post']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AuthService,
        { provide: HttpClient, useValue: httpSpy },
      ],
    });
    httpSpy.post.and.returnValue(of(fakeResponse));
    service = TestBed.inject(AuthService);
  });

  describe('login()', () => {
    it('POSTs to /auth/login with the trimmed email and password', (done) => {
      // The failing smoke scenario: email arrived in the form with leading + trailing
      // whitespace (clipboard paste, autofill). AuthService must trim before sending.
      service.login('  smoke-c55.10-d-160100@test.com  ', '  SmokePwd123!  ').subscribe((resp) => {
        expect(resp).toEqual(fakeResponse);
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/auth\/login$/),
          { email: 'smoke-c55.10-d-160100@test.com', password: 'SmokePwd123!' },
          jasmine.objectContaining({
            headers: jasmine.objectContaining({
              'Content-Type': 'application/json',
            })
          })
        );
        done();
      });
    });

    it('POSTs to /auth/login with a non-hyphen-dot email without altering it', (done) => {
      service.login('user@test.com', 'Pw12345').subscribe(() => {
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/auth\/login$/),
          { email: 'user@test.com', password: 'Pw12345' },
          jasmine.anything()
        );
        done();
      });
    });

    it('handles null/undefined inputs without crashing', (done) => {
      // Front should never pass null/undefined, but AuthService must be defensive — a null
      // email would otherwise break the body serializer and produce the same 400 symptom
      // we're trying to fix.
      service.login(null as unknown as string, undefined as unknown as string).subscribe(() => {
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/auth\/login$/),
          { email: '', password: '' },
          jasmine.anything()
        );
        done();
      });
    });

    it('stores accessToken, refreshToken, expiresAt on success (handleAuthResponse)', (done) => {
      service.login('user@test.com', 'Pw12345').subscribe(() => {
        expect(localStorage.getItem('accessToken')).toBe('access-token');
        expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
        const stored = parseInt(localStorage.getItem('expiresAt') ?? '0', 10);
        expect(stored).toBeGreaterThan(Date.now()); // future timestamp
        done();
      });
    });
  });

  describe('register()', () => {
    it('POSTs to /auth/register with trimmed email, username, and password', (done) => {
      service.register('  reg-c55.10-d-160200@test.com  ', '  reg-user-160200  ', '  RegPwd123!  ').subscribe((resp) => {
        expect(resp).toEqual(fakeResponse);
        expect(httpSpy.post).toHaveBeenCalledWith(
          jasmine.stringMatching(/\/api\/v1\/auth\/register$/),
          {
            email: 'reg-c55.10-d-160200@test.com',
            username: 'reg-user-160200',
            password: 'RegPwd123!',
          },
          jasmine.objectContaining({
            headers: jasmine.objectContaining({
              'Content-Type': 'application/json',
            })
          })
        );
        done();
      });
    });
  });
});
