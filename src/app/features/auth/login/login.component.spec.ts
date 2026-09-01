import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../shared/models/auth.model';
import { LOGIN_AUTOFILL_ANIMATION_NAME, LOGIN_RECOVERY_DELAY_MS, LOGIN_SLOW_NOTICE_DELAY_MS, LoginComponent } from './login.component';

describe('LoginComponent resilient request lifecycle', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  const response: AuthResponse = { accessToken: 'access-token', refreshToken: 'refresh-token', expiresIn: 3600, tokenType: 'Bearer' };

  const withFakeClock = (assertions: () => void): void => {
    jasmine.clock().install();
    try { assertions(); } finally { jasmine.clock().uninstall(); }
  };

  const submitButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('button[type="submit"]');
  const silentlyAutofill = (emailValue = 'autofill@example.test', passwordValue = 'SyntheticPassword123!'): void => {
    component.loginForm.setValue({ email: '', password: '' });
    fixture.detectChanges();
    const email: HTMLInputElement = fixture.nativeElement.querySelector('#login-email');
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#login-password');
    email.value = emailValue;
    password.value = passwordValue;
    // No input/change event is dispatched: this simulates silent browser autofill.
    email.dispatchEvent(new AnimationEvent('animationstart', { bubbles: true, animationName: LOGIN_AUTOFILL_ANIMATION_NAME }));
    fixture.detectChanges();
  };
  const typeCredentials = (emailValue = 'manager@example.com', passwordValue = 'Password123!'): void => {
    component.loginForm.setValue({ email: '', password: '' });
    fixture.detectChanges();
    const email: HTMLInputElement = fixture.nativeElement.querySelector('#login-email');
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#login-password');
    email.value = emailValue;
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = passwordValue;
    password.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: LOGIN_SLOW_NOTICE_DELAY_MS, useValue: 12_000 },
        { provide: LOGIN_RECOVERY_DELAY_MS, useValue: 45_000 },
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

  it('routes once after a normal successful typed login with one actual button click', () => {
    authService.login.and.returnValue(of(response));
    typeCredentials();
    submitButton().click();
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(component.uiState).toBe('SUCCESS');
    expect(router.navigate).toHaveBeenCalledTimes(1);
  });

  it('reproduces the old silent-autofill state before the autofill signal and enables the real button after it', () => {
    authService.login.and.returnValue(of(response));
    component.loginForm.setValue({ email: '', password: '' });
    fixture.detectChanges();
    const email: HTMLInputElement = fixture.nativeElement.querySelector('#login-email');
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#login-password');
    email.value = 'autofill@example.test';
    password.value = 'SyntheticPassword123!';

    expect(component.loginForm.invalid).toBeTrue();
    expect(submitButton().disabled).toBeTrue();

    email.dispatchEvent(new AnimationEvent('animationstart', { bubbles: true, animationName: LOGIN_AUTOFILL_ANIMATION_NAME }));
    fixture.detectChanges();
    expect(component.loginForm.value).toEqual({ email: 'autofill@example.test', password: 'SyntheticPassword123!' });
    expect(submitButton().disabled).toBeFalse();

    submitButton().click();
    expect(authService.login).toHaveBeenCalledOnceWith('autofill@example.test', 'SyntheticPassword123!');
  });

  it('keeps the real submit button disabled for each partial or invalid silent autofill state', () => {
    silentlyAutofill('autofill@example.test', '');
    expect(submitButton().disabled).toBeTrue();
    silentlyAutofill('', 'SyntheticPassword123!');
    expect(submitButton().disabled).toBeTrue();
    silentlyAutofill('   ', 'SyntheticPassword123!');
    expect(submitButton().disabled).toBeTrue();
  });

  it('prevents rapid double click after silent autofill from creating duplicate requests', () => {
    authService.login.and.returnValue(NEVER);
    silentlyAutofill();
    submitButton().click();
    submitButton().click();
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(component.uiState).toBe('PENDING');
  });

  it('prevents a native Enter-submit and actual-click race after silent autofill from creating duplicate requests', () => {
    authService.login.and.returnValue(NEVER);
    silentlyAutofill();
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.requestSubmit();
    submitButton().click();
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(component.uiState).toBe('PENDING');
  });

  it('reaches SLOW at exactly 12s, not at 11.999s, and remains a single transition at 12.001s', () => withFakeClock(() => {
    authService.login.and.returnValue(NEVER);
    submitButton().click();
    jasmine.clock().tick(11_999);
    expect(component.uiState).toBe('PENDING');
    jasmine.clock().tick(1);
    expect(component.uiState).toBe('SLOW');
    jasmine.clock().tick(1);
    expect(component.uiState).toBe('SLOW');
    expect(authService.login).toHaveBeenCalledTimes(1);
  }));

  it('offers recovery at exactly 45s, not at 44.999s, and cancels once at 45.001s', () => withFakeClock(() => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());
    submitButton().click();
    jasmine.clock().tick(44_999);
    expect(component.uiState).toBe('SLOW');
    jasmine.clock().tick(1);
    expect(component.uiState).toBe('RECOVERY_AVAILABLE');
    expect(component.isRequestPending).toBeFalse();
    jasmine.clock().tick(1);
    expect(component.uiState).toBe('RECOVERY_AVAILABLE');
    request.next(response);
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  it('cleans both boundaries when a response wins at 12s and never allows later recovery', () => withFakeClock(() => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());
    submitButton().click();
    jasmine.clock().tick(12_000);
    expect(component.uiState).toBe('SLOW');
    request.next(response);
    request.complete();
    jasmine.clock().tick(33_001);
    expect(component.uiState).toBe('SUCCESS');
    expect(router.navigate).toHaveBeenCalledTimes(1);
  }));

  it('ignores late A after recovery and permits exactly one deliberate B navigation', () => withFakeClock(() => {
    const attemptA = new Subject<AuthResponse>();
    authService.login.and.returnValues(attemptA.asObservable(), of(response));
    submitButton().click();
    jasmine.clock().tick(45_000);
    attemptA.next(response);
    expect(router.navigate).not.toHaveBeenCalled();
    submitButton().click();
    expect(authService.login).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(component.uiState).toBe('SUCCESS');
  }));

  it('maps 401, 500, and network failures to controlled errors without automatic retry', () => {
    authService.login.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'private detail' } })),
      throwError(() => new HttpErrorResponse({ status: 500, error: 'private detail' })),
      throwError(() => new HttpErrorResponse({ status: 0, error: 'private detail' }))
    );
    submitButton().click();
    expect(component.errorMessage).toContain('email o la contraseña');
    submitButton().click();
    expect(component.errorMessage).toContain('No pudimos iniciar sesión');
    submitButton().click();
    expect(component.errorMessage).not.toContain('private detail');
    expect(authService.login).toHaveBeenCalledTimes(3);
  });

  it('cleans timers and cancels the active request on destroy', () => withFakeClock(() => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());
    submitButton().click();
    fixture.destroy();
    jasmine.clock().tick(45_001);
    request.next(response);
    expect(router.navigate).not.toHaveBeenCalled();
  }));

  for (let run = 1; run <= 20; run++) {
    it(`is stable for silent autofill real-click run ${run}/20`, () => {
      authService.login.and.returnValue(of(response));
      silentlyAutofill();
      submitButton().click();
      expect(authService.login).toHaveBeenCalledTimes(1);
      expect(component.uiState).toBe('SUCCESS');
    });

    it(`is stable for exact timer and stale-response run ${run}/20`, () => withFakeClock(() => {
      const attemptA = new Subject<AuthResponse>();
      authService.login.and.returnValues(attemptA.asObservable(), of(response));
      submitButton().click();
      jasmine.clock().tick(12_000);
      expect(component.uiState).toBe('SLOW');
      jasmine.clock().tick(33_000);
      expect(component.uiState).toBe('RECOVERY_AVAILABLE');
      attemptA.next(response);
      submitButton().click();
      expect(router.navigate).toHaveBeenCalledTimes(1);
      expect(authService.login).toHaveBeenCalledTimes(2);
    }));
  }
});
