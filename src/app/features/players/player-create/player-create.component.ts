import { Component, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-player-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './player-create.component.html',
  styleUrls: ['./player-create.component.css']
})
export class PlayerCreateComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  playerForm: FormGroup;
  loading = false;
  randomCount = 10;
  errorMessage = '';
  successMessage = '';
  randomPlayers$?: Observable<{ count?: number } | null>;
  readonly MAX_RANDOM_PLAYERS = 20;

  constructor() {
    this.playerForm = this.fb.group({
      name: ['', Validators.required],
      position: ['MID', Validators.required],
      age: [25, [Validators.required, Validators.min(16), Validators.max(40)]],
      attack: [70, [Validators.required, Validators.min(40), Validators.max(90)]],
      defense: [70, [Validators.required, Validators.min(40), Validators.max(90)]],
      technique: [70, [Validators.required, Validators.min(40), Validators.max(90)]],
      speed: [70, [Validators.required, Validators.min(40), Validators.max(90)]],
      stamina: [70, [Validators.required, Validators.min(40), Validators.max(90)]],
      mentality: [70, [Validators.required, Validators.min(40), Validators.max(90)]]
    });
  }

  onSubmit(): void {
    if (this.playerForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const start = performance.now();

    this.authService.getUserInfo().pipe(
      switchMap(userInfo => {
        const payload = {
          ...this.playerForm.value,
          userId: userInfo.id
        };
        return this.http.post('/api/v1/world/create-custom-player', payload);
      }),
      map((player: any) => {
        const duration = performance.now() - start;
        this.loading = false;
        this.toastService.success(`Player \"${player.name}\" created successfully! (tardó ${duration.toFixed(0)} ms)`);
        this.playerForm.reset({
          position: 'MID',
          age: 25,
          attack: 70,
          defense: 70,
          technique: 70,
          speed: 70,
          stamina: 70,
          mentality: 70
        });
        return player;
      }),
      catchError((err: any) => {
        this.errorMessage = err.error?.message || 'Error creating player';
        this.loading = false;
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    ).subscribe();
  }

  createRandom(): void {
    this.errorMessage = '';
    this.randomPlayers$ = this.authService.getUserInfo().pipe(
      switchMap(userInfo =>
        this.http.post('/api/v1/world/create-random-player', { userId: userInfo.id })
      ),
      map((player: any) => {
        this.toastService.success(`Player \"${player.name}\" created successfully!`);
        return { count: 1 };
      }),
      catchError((err: any) => {
        this.errorMessage = err.error?.message || 'Error generating random player';
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    );
  }

  createRandomBatch(): void {
    if (this.randomCount < 1 || this.randomCount > this.MAX_RANDOM_PLAYERS) {
      this.toastService.error(`Amount must be between 1 and ${this.MAX_RANDOM_PLAYERS}`);
      return;
    }
    this.errorMessage = '';
    this.randomPlayers$ = this.authService.getUserInfo().pipe(
      switchMap(userInfo =>
        this.http.post<{ count: number }>('/api/v1/world/create-random-players', {
          userId: userInfo.id,
          count: this.randomCount
        })
      ),
      map((res: any) => {
        this.toastService.success(`${res?.count ?? this.randomCount} players generated successfully!`);
        return res;
      }),
      catchError((err: any) => {
        const backendMessage = err.error?.message || err.message || 'Server error';
        this.errorMessage = `Error: ${backendMessage}`;
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    );
  }
}
