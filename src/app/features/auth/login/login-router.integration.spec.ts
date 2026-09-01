import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from '../../../app.component';
import { routes } from '../../../app.routes';
import { LoginComponent } from './login.component';

describe('Login route integration', () => {
  let fixture: ComponentFixture<AppComponent>;
  let router: Router;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AppComponent);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
  });

  it('navigates from the real login route only after its single login request succeeds', async () => {
    await router.navigateByUrl('/login');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const login = fixture.debugElement.query(By.directive(LoginComponent))?.componentInstance as LoginComponent;
    expect(login).toBeTruthy();
    login.loginForm.setValue({ email: 'integration@example.test', password: 'SyntheticPassword123!' });
    login.onSubmit();

    const request = http.expectOne(candidate => candidate.url.endsWith('/auth/login'));
    expect(request.request.method).toBe('POST');
    request.flush({ accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600, tokenType: 'Bearer' });

    await fixture.whenStable();
    fixture.detectChanges();
    // The real dashboard starts independent read-only requests after navigation.
    // Resolve them deterministically so this route test verifies no request escapes the test backend.
    http.match(() => true).forEach(pending => {
      pending.flush({}, { status: 500, statusText: 'Controlled test response' });
    });
    await fixture.whenStable();
    expect(router.url).toBe('/dashboard');
  });
});
