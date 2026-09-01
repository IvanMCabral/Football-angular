import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AppComponent } from '../../../app.component';
import { appConfig } from '../../../app.config';

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
      providers: [...appConfig.providers, provideHttpClientTesting()]
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

  it('syncs silent autofill, enables the actual button, and navigates after its single real-route click', async () => {
    await router.navigateByUrl('/login');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const email: HTMLInputElement = fixture.nativeElement.querySelector('#login-email');
    const password: HTMLInputElement = fixture.nativeElement.querySelector('#login-password');
    const submit: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    email.value = 'integration@example.test';
    password.value = 'SyntheticPassword123!';
    email.dispatchEvent(new AnimationEvent('animationstart', { bubbles: true, animationName: 'login-autofill-start' }));
    fixture.detectChanges();
    expect(submit.disabled).toBeFalse();
    submit.click();

    const request = http.expectOne(candidate => candidate.url.endsWith('/auth/login'));
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'integration@example.test', password: 'SyntheticPassword123!' });
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
