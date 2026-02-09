import { Component, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TeamService } from '../services/team.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

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
  private router = inject(Router);
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
    this.teamForm.patchValue({ city: '' }); // Reset city
  }

  generateRandomTeam(): void {
    this.errorMessage = '';
    this.randomTeam$ = this.authService.getUserInfo().pipe(
      switchMap(userInfo => this.teamService.createRandomSessionTeam(userInfo.id)),
      map((team: any) => {
        this.toastService.success(`Team \"${team.name}\" created successfully!`);
        return team;
      }),
      catchError((err: any) => {
        this.errorMessage = err.error?.message || 'Failed to generate random team';
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    );
  }

  generateRandomTeams(count: number): void {
    this.errorMessage = '';
    this.randomTeam$ = this.authService.getUserInfo().pipe(
      switchMap(userInfo => this.teamService.createRandomSessionTeams(userInfo.id, count)),
      map((response: any) => {
        this.toastService.success(`${response.count} teams created successfully!`);
        return response;
      }),
      catchError((err: any) => {
        this.errorMessage = err.error?.message || 'Failed to generate random teams';
        this.toastService.error(this.errorMessage);
        return of(null);
      })
    );
  }

  onSubmit(): void {
    if (this.teamForm.invalid) {
      console.log('[TEAM CREATE] Form invalid, not submitting');
      return;
    }

    this.successMessage = '';
    this.loading = true;
    this.errorMessage = '';

    const start = performance.now();
    
    // Obtener userId del AuthService y crear payload
    this.authService.getUserInfo().pipe(
      switchMap(userInfo => {
        const payload = {
          userId: userInfo.id,
          name: this.teamForm.value.name,
          country: this.teamForm.value.country,
          budget: this.teamForm.value.budget * 1000000, // Convert millions to actual value
          formation: this.teamForm.value.formation
        };
        console.log('[TEAM CREATE] Payload con userId:', payload);
        return this.teamService.createSessionTeam(payload);
      }),
      map((team: any) => {
        const end = performance.now();
        const duration = end - start;
        console.log(`[TEAM CREATE] Tiempo de respuesta create-team: ${duration.toFixed(2)} ms`);
        this.loading = false;
        this.toastService.success(`Team \"${team.name}\" created successfully! (tardó ${duration.toFixed(0)} ms)`);
        // Reset form immediately
        this.teamForm.reset({ budget: 100, formation: '4-3-3' });
        this.availableCities = [];
        return team;
      }),
      catchError((err: any) => {
        const end = performance.now();
        const duration = end - start;
        console.log(`[TEAM CREATE] ERROR tiempo de respuesta create-team: ${duration.toFixed(2)} ms`);
        this.errorMessage = err.error?.message || 'Failed to create club';
        this.loading = false;
        this.toastService.error(this.errorMessage + ` (tardó ${duration.toFixed(0)} ms)`);
        return of(null);
      })
    ).subscribe();
  }
}
