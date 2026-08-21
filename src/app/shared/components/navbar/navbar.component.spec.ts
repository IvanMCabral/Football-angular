import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService, AuthStatus } from '../../../core/services/auth.service';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent initial session resolution', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  const authStatus = new BehaviorSubject<AuthStatus>('unknown');
  const authService = {
    authStatus$: authStatus.asObservable(),
    logout: jasmine.createSpy('logout')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(NavbarComponent);
  });

  it('shows neutral session feedback until asynchronous restoration resolves anonymous', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Comprobando sesión');
    expect(fixture.nativeElement.textContent).not.toContain('Ingresar');
    expect(fixture.nativeElement.textContent).not.toContain('Salir');

    authStatus.next('anonymous');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ingresar');
    expect(fixture.nativeElement.textContent).toContain('Registrarse');
    expect(fixture.nativeElement.textContent).not.toContain('Comprobando sesión');
  });
});
