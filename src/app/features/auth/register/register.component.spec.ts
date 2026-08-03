import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../shared/models/auth.model';
import {
  REGISTRATION_REQUEST_TIMEOUT_MS,
  RegisterComponent,
  SLOW_SERVER_NOTICE_DELAY_MS
} from './register.component';

describe('RegisterComponent request lifecycle', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  const response: AuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer'
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        provideRouter([]),
        { provide: REGISTRATION_REQUEST_TIMEOUT_MS, useValue: 100 },
        { provide: SLOW_SERVER_NOTICE_DELAY_MS, useValue: 10 }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    component.registerForm.setValue({
      username: 'new-manager',
      email: 'new-manager@example.com',
      password: 'Password123!'
    });
    fixture.detectChanges();
  });

  it('navigates after a successful registration and finalizes loading', () => {
    authService.register.and.returnValue(of(response));

    component.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.loading).toBeFalse();
    expect(component.serverStartingMessage).toBeFalse();
  });

  it('shows the startup message for a slow request without resubmitting it', async () => {
    authService.register.and.returnValue(NEVER);

    component.onSubmit();
    await new Promise(resolve => setTimeout(resolve, 20));
    fixture.detectChanges();

    expect(component.loading).toBeTrue();
    expect(component.serverStartingMessage).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('servidor gratuito se está iniciando');
    expect(authService.register).toHaveBeenCalledTimes(1);

    await new Promise(resolve => setTimeout(resolve, 120));
    fixture.detectChanges();
    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toContain('no respondió a tiempo');
    expect(authService.register).toHaveBeenCalledTimes(1);
  });

  it('clears loading and explains a network/CORS failure', () => {
    authService.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toContain('No se pudo conectar');
  });

  it('maps duplicate registration to a safe conflict message', () => {
    authService.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toContain('ya existe');
  });

  it('maps validation, server and HTML responses without exposing internals', () => {
    const failures = [
      { error: new HttpErrorResponse({ status: 422 }), message: 'Revisá los datos' },
      { error: new HttpErrorResponse({ status: 500 }), message: 'servidor no pudo' },
      { error: new HttpErrorResponse({ status: 200, error: '<html>proxy error</html>' }), message: 'No se pudo completar' }
    ];

    for (const failure of failures) {
      authService.register.and.returnValue(throwError(() => failure.error));
      component.onSubmit();
      expect(component.loading).toBeFalse();
      expect(component.errorMessage).toContain(failure.message);
      expect(component.errorMessage).not.toContain('proxy error');
    }
  });

  it('does not retry automatically after a timeout', async () => {
    authService.register.and.returnValue(NEVER);

    component.onSubmit();
    await new Promise(resolve => setTimeout(resolve, 120));

    expect(authService.register).toHaveBeenCalledTimes(1);
    expect(component.loading).toBeFalse();
  });
});
