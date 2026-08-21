import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../shared/models/auth.model';
import { LOGIN_SLOW_NOTICE_DELAY_MS, LoginComponent } from './login.component';

describe('LoginComponent request lifecycle', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  const response: AuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer'
  };
  const waitForSlowNotice = () => new Promise(resolve => setTimeout(resolve, 20));

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: LOGIN_SLOW_NOTICE_DELAY_MS, useValue: 10 },
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

  it('shows pending feedback and routes after a fast successful login with one request', () => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());

    component.onSubmit();
    fixture.detectChanges();

    expect(component.uiState).toBe('PENDING');
    expect(fixture.nativeElement.textContent).toContain('Ingresando');
    expect(authService.login).toHaveBeenCalledTimes(1);

    request.next(response);
    request.complete();

    expect(component.uiState).toBe('SUCCESS');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(fixture.nativeElement.textContent).not.toContain('Está tardando más de lo esperado');
  });

  it('keeps the original request alive through slow feedback and accepts a late success', async () => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());

    component.onSubmit();
    await waitForSlowNotice();
    fixture.detectChanges();

    expect(component.uiState).toBe('SLOW');
    expect(fixture.nativeElement.textContent).toContain('Está tardando más de lo esperado');
    expect(authService.login).toHaveBeenCalledTimes(1);

    request.next(response);
    request.complete();
    fixture.detectChanges();

    expect(component.uiState).toBe('SUCCESS');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(fixture.nativeElement.textContent).not.toContain('Está tardando más de lo esperado');
    expect(authService.login).toHaveBeenCalledTimes(1);
  });

  it('keeps a non-terminal request coherent without inventing an error or retrying', async () => {
    authService.login.and.returnValue(NEVER);

    component.onSubmit();
    await waitForSlowNotice();
    fixture.detectChanges();

    expect(component.uiState).toBe('SLOW');
    expect(component.errorMessage).toBe('');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(authService.login).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });

  it('maps 401 to a controlled credential error and permits a manual retry', () => {
    authService.login.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'secret backend detail' } })),
      of(response)
    );

    component.onSubmit();
    fixture.detectChanges();

    expect(component.uiState).toBe('CONTROLLED_ERROR');
    expect(component.errorMessage).toContain('email o la contraseña');
    expect(component.errorMessage).not.toContain('secret backend detail');
    expect(component.isRequestPending).toBeFalse();

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('maps server or network failures to a generic recoverable error without automatic retry', () => {
    authService.login.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 500, error: 'provider detail' })),
      of(response)
    );

    component.onSubmit();
    fixture.detectChanges();

    expect(component.uiState).toBe('CONTROLLED_ERROR');
    expect(component.errorMessage).toContain('No pudimos iniciar sesión');
    expect(component.errorMessage).not.toContain('provider detail');
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(component.isRequestPending).toBeFalse();

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('prevents repeated submit attempts while the first request is pending', async () => {
    authService.login.and.returnValue(NEVER);

    component.onSubmit();
    component.onSubmit();
    await waitForSlowNotice();
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(component.uiState).toBe('SLOW');
    fixture.destroy();
  });

  it('cleans up the presentation timer and request subscription on destroy', async () => {
    const request = new Subject<AuthResponse>();
    authService.login.and.returnValue(request.asObservable());

    component.onSubmit();
    fixture.destroy();
    await waitForSlowNotice();
    request.next(response);
    request.complete();

    expect(component.uiState).toBe('PENDING');
    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
