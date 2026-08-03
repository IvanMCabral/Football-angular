import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, InjectionToken, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

export const REGISTRATION_REQUEST_TIMEOUT_MS = new InjectionToken<number>(
  'REGISTRATION_REQUEST_TIMEOUT_MS',
  { providedIn: 'root', factory: () => 120_000 }
);
export const SLOW_SERVER_NOTICE_DELAY_MS = new InjectionToken<number>(
  'SLOW_SERVER_NOTICE_DELAY_MS',
  { providedIn: 'root', factory: () => 5_000 }
);

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private changeDetector = inject(ChangeDetectorRef);
  private requestTimeoutMs = inject(REGISTRATION_REQUEST_TIMEOUT_MS);
  private slowServerNoticeDelayMs = inject(SLOW_SERVER_NOTICE_DELAY_MS);

  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  serverStartingMessage = false;

  private slowServerNoticeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.serverStartingMessage = false;
    this.clearSlowServerNoticeTimer();
    this.slowServerNoticeTimer = setTimeout(() => {
      if (this.loading) {
        this.serverStartingMessage = true;
        this.changeDetector.detectChanges();
      }
    }, this.slowServerNoticeDelayMs);

    const { email, username, password } = this.registerForm.value;
    this.authService.register(email, username, password).pipe(
      timeout({ first: this.requestTimeoutMs }),
      finalize(() => {
        this.loading = false;
        this.serverStartingMessage = false;
        this.clearSlowServerNoticeTimer();
        this.changeDetector.detectChanges();
      })
    ).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (error: unknown) => {
        this.errorMessage = this.registrationErrorMessage(error);
        this.changeDetector.detectChanges();
      }
    });
  }

  private registrationErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'El servidor gratuito no respondió a tiempo. La cuenta podría haberse creado; intentá iniciar sesión antes de volver a registrarte.';
    }
    if (this.isConflictError(error)) {
      return 'El usuario ya existe. Usa otro email o inicia sesión.';
    }
    if (error instanceof HttpErrorResponse && error.status === 422) {
      return 'Revisá los datos ingresados e intentá nuevamente.';
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisá tu conexión e intentá nuevamente.';
    }
    if (error instanceof HttpErrorResponse && error.status >= 500) {
      return 'El servidor no pudo completar el registro. Intentá nuevamente en unos instantes.';
    }
    return 'No se pudo completar el registro. Intentá nuevamente.';
  }

  private isConflictError(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'status' in error
      && (error as { status?: unknown }).status === 409;
  }

  private clearSlowServerNoticeTimer(): void {
    if (this.slowServerNoticeTimer !== undefined) {
      clearTimeout(this.slowServerNoticeTimer);
      this.slowServerNoticeTimer = undefined;
    }
  }
}
