import { Component, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TeamService } from '../services/team.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { RandomTeamsResponse, SessionTeam } from '../../../shared/models/team.model';

interface Country {
  code: string;
  name: string;
  cities: string[];
}

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './team-create.component.html',
  styleUrls: ['./team-create.component.css']
})
export class TeamCreateComponent {
  successMessage = '';
  randomTeam$: Observable<{ name?: string; count?: number } | null> = of(null);
  private fb = inject(FormBuilder);
  private teamService = inject(TeamService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);

  teamForm: FormGroup;
  loading = false;
  errorMessage = '';

  countries: Country[] = [
    {
      code: 'AR',
      name: 'Argentina',
      cities: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata']
    },
    {
      code: 'ES',
      name: 'España',
      cities: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao']
    },
    {
      code: 'GB',
      name: 'Inglaterra',
      cities: ['London', 'Manchester', 'Liverpool', 'Birmingham', 'Newcastle']
    },
    {
      code: 'IT',
      name: 'Italia',
      cities: ['Roma', 'Milano', 'Napoli', 'Torino', 'Firenze']
    },
    {
      code: 'DE',
      name: 'Alemania',
      cities: ['Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt']
    },
    {
      code: 'FR',
      name: 'Francia',
      cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice']
    }
  ];

  availableCities: string[] = [];

  constructor() {
    this.teamForm = this.fb.group({
      name: ['', Validators.required],
      country: ['', Validators.required],
      city: [''],
      budget: [100, [Validators.required, Validators.min(0)]],
      formation: ['4-3-3']
    });
  }

  onCountryChange(): void {
    const countryName = this.teamForm.get('country')?.value;
    const country = this.countries.find(c => c.name === countryName);
    this.availableCities = country?.cities || [];
    this.teamForm.patchValue({ city: '' });
  }

  generateRandomTeam(): void {
    this.errorMessage = '';
    this.randomTeam$ = this.authService.getUserInfo().pipe(
      switchMap(userInfo => this.teamService.createRandomSessionTeam(userInfo.id)),
      map((team: SessionTeam) => {
        this.toastService.success(`Team \"${team.name}\" created successfully!`);
        return team;
      }),
      catchError((err: unknown) => {
        this.errorMessage = this.readErrorMessage(err, 'Failed to generate random team');
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    );
  }

  generateRandomTeams(count: number): void {
    this.errorMessage = '';
    this.randomTeam$ = this.authService.getUserInfo().pipe(
      switchMap(userInfo => this.teamService.createRandomSessionTeams(userInfo.id, count)),
      map((response: RandomTeamsResponse) => {
        this.toastService.success(`${response.count} teams created successfully!`);
        return response;
      }),
      catchError((err: unknown) => {
        this.errorMessage = this.readErrorMessage(err, 'Failed to generate random teams');
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    );
  }

  onSubmit(): void {
    if (this.teamForm.invalid) {
      return;
    }

    this.successMessage = '';
    this.loading = true;
    this.errorMessage = '';

    const start = performance.now();

    this.authService.getUserInfo().pipe(
      switchMap(userInfo => {
        const payload = {
          userId: userInfo.id,
          name: this.teamForm.value.name,
          country: this.teamForm.value.country,
          budget: this.teamForm.value.budget * 1000000,
          formation: this.teamForm.value.formation
        };
        return this.teamService.createSessionTeam(payload);
      }),
      map((team: SessionTeam) => {
        const duration = performance.now() - start;
        this.loading = false;
        this.toastService.success(`Team \"${team.name}\" created successfully! (tardó ${duration.toFixed(0)} ms)`);
        this.teamForm.reset({ budget: 100, formation: '4-3-3' });
        this.availableCities = [];
        return team;
      }),
      catchError((err: unknown) => {
        this.errorMessage = this.readErrorMessage(err, 'Failed to create club');
        this.loading = false;
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    ).subscribe();
  }

  private readErrorMessage(err: unknown, fallback: string): string {
    if (typeof err !== 'object' || err === null) return fallback;
    const errorBody = 'error' in err ? (err as { error?: unknown }).error : null;
    if (typeof errorBody !== 'object' || errorBody === null || !('message' in errorBody)) return fallback;
    const message = (errorBody as { message?: unknown }).message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}
