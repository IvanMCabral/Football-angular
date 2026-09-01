import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../shared/models/auth.model';
import { LOGIN_RECOVERY_DELAY_MS, LOGIN_SLOW_NOTICE_DELAY_MS, LoginComponent } from './login.component';

describe('LoginComponent resilient request lifecycle', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  const response: AuthResponse = {
    accessToken: 'access-token', refreshToken: 'refresh-token', expiresIn: 3600, tokenType: 'Bearer'
  };

  const withFakeClock = (assertions: () => void): void => {
    jasmine.clock().install();
    try {
      assertions();
    } finally {
      jasmine.clock().uninstall();
    }
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: LOGIN_SLOW_NOTICE_DELAY_MS, useValue: 10 },
        { provide: LOGIN_RECOVERY_DELAY_MS, useValue: 40 },
        provideRouter([])
      ]
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    component.loginForm.setValue({ email: 'manager@example.com', password: 'Password123!' });
    fixture.detectChanges();
  });

  it('routes once after a normal successful login with one request', () => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());
    component.onSubmit();
    expect(component.uiState).toBe('PENDING');
    expect(authService.login).toHaveBeenCalledTimes(1);
    request.next(response);
    request.complete();
    fixture.detectChanges();
    expect(component.uiState).toBe('SUCCESS');
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('keeps one request through slow feedback and accepts success before recovery', () => withFakeClock(() => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());
    component.onSubmit();
    jasmine.clock().tick(10);
    fixture.detectChanges();
    expect(component.uiState).toBe('SLOW');
    expect(fixture.nativeElement.textContent).toContain('Está tardando más de lo esperado');
    expect(authService.login).toHaveBeenCalledTimes(1);
    request.next(response);
    request.complete();
    fixture.detectChanges();
    expect(component.uiState).toBe('SUCCESS');
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledTimes(1);
  }));

  it('cancels a non-terminal request at recovery, returns control, and ignores its late success', () => withFakeClock(() => {
    const attemptA = new Subject<AuthResponse>();
    authService.login.and.returnValue(attemptA.asObservable());
    component.onSubmit();
    jasmine.clock().tick(40);
    fixture.detectChanges();
    expect(component.uiState).toBe('RECOVERY_AVAILABLE');
    expect(component.isRequestPending).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Podés intentar nuevamente');
    expect(authService.login).toHaveBeenCalledTimes(1);
    attemptA.next(response);
    attemptA.complete();
    fixture.detectChanges();
    expect(component.uiState).toBe('RECOVERY_AVAILABLE');
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('allows exactly one deliberate retry after recovery and keeps attempt A stale', () => withFakeClock(() => {
    const attemptA = new Subject<AuthResponse>();
    authService.login.and.returnValues(attemptA.asObservable(), of(response));
    component.onSubmit();
    jasmine.clock().tick(40);
    component.onSubmit();
    expect(authService.login).toHaveBeenCalledTimes(2);
    expect(component.uiState).toBe('SUCCESS');
    expect(router.navigate).toHaveBeenCalledTimes(1);
    attemptA.next(response);
    attemptA.complete();
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(component.uiState).toBe('SUCCESS');
  }));

  it('maps 401, 500, and network failures to controlled errors without automatic retry', () => {
    authService.login.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'private detail' } })),
      throwError(() => new HttpErrorResponse({ status: 500, error: 'private detail' })),
      throwError(() => new HttpErrorResponse({ status: 0, error: 'private detail' }))
    );
    component.onSubmit();
    expect(component.uiState).toBe('CONTROLLED_ERROR');
    expect(component.errorMessage).toContain('email o la contraseña');
    component.onSubmit();
    expect(component.uiState).toBe('CONTROLLED_ERROR');
    expect(component.errorMessage).toContain('No pudimos iniciar sesión');
    component.onSubmit();
    expect(component.uiState).toBe('CONTROLLED_ERROR');
    expect(component.errorMessage).not.toContain('private detail');
    expect(authService.login).toHaveBeenCalledTimes(3);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('prevents double click and repeated Enter submissions while pending', () => {
    authService.login.and.returnValue(NEVER);
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    component.onSubmit();
    component.onSubmit();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(component.uiState).toBe('PENDING');
    expect(authService.login).toHaveBeenCalledTimes(1);
  });

  it('submits password-manager-populated DOM values once without prior input events', () => {
    authService.login.and.returnValue(of(response));
    component.loginForm.setValue({ email: '', password: '' });
    fixture.detectChanges();
    const email: HTMLInputElement = fixture.nativeElement.querySelector('#login-email');
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#login-password');
    email.value = 'autofill@example.test';
    password.value = 'SyntheticPassword123!';
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(authService.login).toHaveBeenCalledWith('autofill@example.test', 'SyntheticPassword123!');
    expect(component.uiState).toBe('SUCCESS');
  });

  it('cleans timers and cancels the active request on destroy', () => withFakeClock(() => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());
    component.onSubmit();
    fixture.destroy();
    jasmine.clock().tick(100);
    request.next(response);
    request.complete();
    expect(component.uiState).toBe('PENDING');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(authService.login).toHaveBeenCalledTimes(1);
  }));
});
