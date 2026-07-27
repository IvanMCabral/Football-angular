import { Component, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface CreatedPlayerResponse {
  name: string;
}

interface RandomPlayersResponse {
  count: number;
}

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
  private apiUrl = environment.apiUrl;

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
        return this.http.post<CreatedPlayerResponse>(`${this.apiUrl}/world/create-custom-player`, payload);
      }),
      map((player) => {
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
      catchError((err: unknown) => {
        this.errorMessage = this.readErrorMessage(err, 'Error creating player');
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
        this.http.post<CreatedPlayerResponse>(`${this.apiUrl}/world/create-random-player`, { userId: userInfo.id })
      ),
      map((player) => {
        this.toastService.success(`Player \"${player.name}\" created successfully!`);
        return { count: 1 };
      }),
      catchError((err: unknown) => {
        this.errorMessage = this.readErrorMessage(err, 'Error generating random player');
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
        this.http.post<RandomPlayersResponse>(`${this.apiUrl}/world/create-random-players`, {
          userId: userInfo.id,
          count: this.randomCount
        })
      ),
      map((res) => {
        this.toastService.success(`${res?.count ?? this.randomCount} players generated successfully!`);
        return res;
      }),
      catchError((err: unknown) => {
        const backendMessage = this.readErrorMessage(err, 'Server error');
        this.errorMessage = `Error: ${backendMessage}`;
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    );
  }

  private readErrorMessage(err: unknown, fallback: string): string {
    if (typeof err !== 'object' || err === null) return fallback;
    const maybeMessage = 'message' in err ? (err as { message?: unknown }).message : null;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
    const errorBody = 'error' in err ? (err as { error?: unknown }).error : null;
    if (typeof errorBody !== 'object' || errorBody === null || !('message' in errorBody)) return fallback;
    const backendMessage = (errorBody as { message?: unknown }).message;
    return typeof backendMessage === 'string' && backendMessage.trim() ? backendMessage : fallback;
  }
}
