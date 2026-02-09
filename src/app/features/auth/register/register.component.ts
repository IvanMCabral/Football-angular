import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
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
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

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
    const { email, username, password } = this.registerForm.value;
    (this.authService.register(email, username, password) as any).subscribe({
      next: () => {
        this.successMessage = 'Registro exitoso. Ahora puedes iniciar sesión.';
        this.loading = false;
        this.registerForm.reset();
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: any) => {
        if (err?.status === 409) {
          this.errorMessage = 'El usuario ya existe. Usa otro email o inicia sesión.';
        } else {
          this.errorMessage = err?.error?.message || 'Error al registrar usuario';
        }
        this.loading = false;
      }
    });
  }
}
