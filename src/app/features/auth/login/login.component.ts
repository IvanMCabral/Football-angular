import { ChangeDetectorRef, Component, InjectionToken, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

export type LoginUiState = 'IDLE' | 'PENDING' | 'SLOW' | 'CONTROLLED_ERROR' | 'SUCCESS';

export const LOGIN_SLOW_NOTICE_DELAY_MS = new InjectionToken<number>(
  'LOGIN_SLOW_NOTICE_DELAY_MS',
  { providedIn: 'root', factory: () => 12_000 }
);

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private changeDetector = inject(ChangeDetectorRef);
  private slowNoticeDelayMs = inject(LOGIN_SLOW_NOTICE_DELAY_MS);

  loginForm: FormGroup;
  uiState: LoginUiState = 'IDLE';
  errorMessage = '';
  private slowNoticeTimer: ReturnType<typeof setTimeout> | undefined;
  private loginSubscription: Subscription | undefined;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  get isRequestPending(): boolean {
    return this.uiState === 'PENDING' || this.uiState === 'SLOW';
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isRequestPending) return;

    this.uiState = 'PENDING';
    this.errorMessage = '';
    this.clearSlowNoticeTimer();
    this.slowNoticeTimer = setTimeout(() => {
      if (this.uiState === 'PENDING') {
        // This is presentation-only: the original request continues untouched.
        this.uiState = 'SLOW';
        this.changeDetector.markForCheck();
      }
    }, this.slowNoticeDelayMs);

    const { email, password } = this.loginForm.value;
    this.loginSubscription = this.authService.login(email, password).subscribe({
      next: () => {
        this.clearSlowNoticeTimer();
        this.uiState = 'SUCCESS';
        this.errorMessage = '';
        this.changeDetector.markForCheck();
        this.router.navigate(['/dashboard']);
      },
      error: (error: unknown) => {
        this.clearSlowNoticeTimer();
        this.uiState = 'CONTROLLED_ERROR';
        this.errorMessage = this.loginErrorMessage(error);
        this.changeDetector.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearSlowNoticeTimer();
    this.loginSubscription?.unsubscribe();
  }

  private loginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'El email o la contraseña no son correctos. Revisalos e intentá nuevamente.';
    }
    return 'No pudimos iniciar sesión en este momento. Revisá tu conexión o intentá nuevamente en unos instantes.';
  }

  private clearSlowNoticeTimer(): void {
    if (this.slowNoticeTimer !== undefined) {
      clearTimeout(this.slowNoticeTimer);
      this.slowNoticeTimer = undefined;
    }
  }
}
