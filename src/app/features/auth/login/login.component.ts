import { ChangeDetectorRef, Component, ElementRef, InjectionToken, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

export type LoginUiState = 'IDLE' | 'PENDING' | 'SLOW' | 'RECOVERY_AVAILABLE' | 'CONTROLLED_ERROR' | 'SUCCESS';

export const LOGIN_SLOW_NOTICE_DELAY_MS = new InjectionToken<number>(
  'LOGIN_SLOW_NOTICE_DELAY_MS',
  { providedIn: 'root', factory: () => 12_000 }
);

/** Gives the user control back without confusing the informational slow notice with a transport timeout. */
export const LOGIN_RECOVERY_DELAY_MS = new InjectionToken<number>(
  'LOGIN_RECOVERY_DELAY_MS',
  { providedIn: 'root', factory: () => 45_000 }
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
  private recoveryDelayMs = inject(LOGIN_RECOVERY_DELAY_MS);

  @ViewChild('emailInput') private emailInput?: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') private passwordInput?: ElementRef<HTMLInputElement>;

  loginForm: FormGroup;
  uiState: LoginUiState = 'IDLE';
  errorMessage = '';
  private slowNoticeTimer: ReturnType<typeof setTimeout> | undefined;
  private recoveryTimer: ReturnType<typeof setTimeout> | undefined;
  private loginSubscription: Subscription | undefined;
  private attemptSequence = 0;
  private activeAttemptId: number | undefined;

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
    this.syncAutofillValues();
    if (this.loginForm.invalid || this.isRequestPending) return;

    this.cancelActiveRequest();
    const attemptId = ++this.attemptSequence;
    this.activeAttemptId = attemptId;
    this.uiState = 'PENDING';
    this.errorMessage = '';
    this.clearRequestTimers();
    this.slowNoticeTimer = setTimeout(() => {
      if (this.isActiveAttempt(attemptId) && this.uiState === 'PENDING') {
        this.uiState = 'SLOW';
        this.changeDetector.markForCheck();
      }
    }, this.slowNoticeDelayMs);
    this.recoveryTimer = setTimeout(() => this.makeRecoveryAvailable(attemptId), this.recoveryDelayMs);

    const { email, password } = this.loginForm.value;
    this.loginSubscription = this.authService.login(email, password).subscribe({
      next: () => {
        if (!this.isActiveAttempt(attemptId)) return;
        this.finishActiveAttempt();
        this.uiState = 'SUCCESS';
        this.errorMessage = '';
        this.changeDetector.markForCheck();
        this.router.navigate(['/dashboard']);
      },
      error: (error: unknown) => {
        if (!this.isActiveAttempt(attemptId)) return;
        this.finishActiveAttempt();
        this.uiState = 'CONTROLLED_ERROR';
        this.errorMessage = this.loginErrorMessage(error);
        this.changeDetector.markForCheck();
      }
    });
  }

  /** Synchronizes values a password manager may have populated without input events before validating or submitting. */
  syncAutofillValues(): void {
    this.syncControlWithInput('email', this.emailInput?.nativeElement.value);
    this.syncControlWithInput('password', this.passwordInput?.nativeElement.value);
  }

  ngOnDestroy(): void {
    this.attemptSequence++;
    this.activeAttemptId = undefined;
    this.clearRequestTimers();
    this.cancelActiveRequest();
  }

  private loginErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      return 'El email o la contraseña no son correctos. Revisalos e intentá nuevamente.';
    }
    return 'No pudimos iniciar sesión en este momento. Revisá tu conexión o intentá nuevamente en unos instantes.';
  }

  private makeRecoveryAvailable(attemptId: number): void {
    if (!this.isActiveAttempt(attemptId)) return;

    // HttpClient cancels its underlying request when its subscription is unsubscribed.
    // The attempt id also protects the UI against any non-cooperative observable used in tests or future refactors.
    this.cancelActiveRequest();
    this.activeAttemptId = undefined;
    this.clearRequestTimers();
    this.uiState = 'RECOVERY_AVAILABLE';
    this.errorMessage = 'El servidor está tardando más de lo esperado. Podés intentar nuevamente cuando quieras.';
    this.changeDetector.markForCheck();
  }

  private isActiveAttempt(attemptId: number): boolean {
    return this.activeAttemptId === attemptId;
  }

  private finishActiveAttempt(): void {
    this.activeAttemptId = undefined;
    this.clearRequestTimers();
    this.loginSubscription = undefined;
  }

  private cancelActiveRequest(): void {
    this.loginSubscription?.unsubscribe();
    this.loginSubscription = undefined;
  }

  private syncControlWithInput(controlName: 'email' | 'password', value: string | undefined): void {
    if (value === undefined) return;
    const control = this.loginForm.get(controlName);
    if (control && control.value !== value) {
      control.setValue(value, { emitEvent: false });
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private clearRequestTimers(): void {
    if (this.slowNoticeTimer !== undefined) {
      clearTimeout(this.slowNoticeTimer);
      this.slowNoticeTimer = undefined;
    }
    if (this.recoveryTimer !== undefined) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = undefined;
    }
  }
}
