import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject, combineLatest, firstValueFrom, concat } from 'rxjs';
import { map, switchMap, catchError, take, tap, startWith, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { of } from 'rxjs';

interface League {
  realLeagueId: string;
  name: string;
  country: string;
}

interface TeamWithOVR {
  worldTeamId: string;
  name: string;
  country: string;
  formation: string;
  ovr: number;
  playerCount: number;
}

interface DivisionPreview {
  divisionNumber: number;
  name: string;
  teams: TeamWithOVR[];
}

@Component({
  selector: 'app-career-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './career-setup.component.html',
  styleUrls: ['./career-setup.component.css']
})
export class CareerSetupComponent implements OnInit {
  leagues$: Observable<League[]>;
  teamsWithOVR$: Observable<TeamWithOVR[]>;
  divisionPreviews$: Observable<DivisionPreview[]>;
  availableTeamsPerDivision$: Observable<number[]>;
  totalTeamsInLeague$: Observable<number>;
  loading$: Observable<boolean>;
  loadingTeams$: Observable<boolean>;
  error$ = new BehaviorSubject<string | null>(null);

  seedingWorld = false;
  private refreshLeaguesTrigger = new BehaviorSubject<void>(undefined);

  private _selectedLeagueId: string | null = null;
  
  get selectedLeagueId(): string | null {
    return this._selectedLeagueId;
  }
  
  set selectedLeagueId(value: string | null) {
    this._selectedLeagueId = value;
    this.selectedTeamId = null;
    this.selectedTeamsPerDivision = null;
    this.divisionChangeSubject.next(null);
    this.leagueChangeSubject.next(value);
  }
  
  selectedTeamId: string | null = null;
  selectedDifficulty: string | null = null;
  selectedGameSpeed: string | null = null;
  selectedTeamsPerDivision: number | null = null;
  creating = false;
  
  private divisionChangeSubject = new BehaviorSubject<number | null>(null);
  private leagueChangeSubject = new BehaviorSubject<string | null>(null);

  difficulties = [
    { value: 'EASY', label: 'Fácil' },
    { value: 'MEDIUM', label: 'Normal' },
    { value: 'HARD', label: 'Difícil' }
  ];

  gameSpeeds = [
    { value: 'SLOW', label: 'Lenta' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'FAST', label: 'Rápida' }
  ];

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    this.leagues$ = combineLatest([
      this.authService.getUserInfo(),
      this.refreshLeaguesTrigger
    ]).pipe(
      switchMap(([userInfo]) =>
        this.http.get<League[]>(`${environment.apiUrl}/world/leagues?userId=${userInfo.id}`)
      ),
      catchError(err => {
        this.error$.next('Error al cargar ligas');
        return of([]);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.teamsWithOVR$ = this.leagueChangeSubject.pipe(
      switchMap(leagueId => {
        if (!leagueId) {
          return of([]);
        }
        // Emit an empty list first so the UI can show the team-loading state immediately.
        return concat(
          of([] as TeamWithOVR[]),
          this.authService.getUserInfo().pipe(
            switchMap(userInfo =>
              this.http.get<TeamWithOVR[]>(`${environment.apiUrl}/world/leagues/${leagueId}/teams-with-ovr?userId=${userInfo.id}`)
            ),
            catchError(err => {
              this.error$.next('Error al cargar equipos');
              return of([] as TeamWithOVR[]);
            })
          )
        );
      })
    );

    this.divisionPreviews$ = combineLatest([
      this.divisionChangeSubject,
      this.leagueChangeSubject
    ]).pipe(
      switchMap(([teamsPerDivision, leagueId]) => {
        if (!teamsPerDivision || !leagueId) {
          return of<DivisionPreview[]>([]);
        }
        return this.authService.getUserInfo().pipe(
          switchMap(userInfo => 
            this.http.get<DivisionPreview[]>(
              `${environment.apiUrl}/world/leagues/${leagueId}/division-preview?teamsPerDivision=${teamsPerDivision}&userId=${userInfo.id}`
            )
          ),
          catchError(err => {
            this.error$.next('Error al calcular preview de divisiones');
            return of<DivisionPreview[]>([]);
          })
        );
      })
    );

    this.availableTeamsPerDivision$ = this.teamsWithOVR$.pipe(
      map(teams => {
        const options: number[] = [];
        for (let i = 2; i <= teams.length; i++) {
          options.push(i);
        }
        return options;
      })
    );

    this.totalTeamsInLeague$ = this.teamsWithOVR$.pipe(
      map(teams => teams.length)
    );

    this.loading$ = this.leagues$.pipe(
      map(() => false),
      startWith(true),
      distinctUntilChanged()
    );

    this.loadingTeams$ = combineLatest([
      this.leagueChangeSubject,
      this.teamsWithOVR$
    ]).pipe(
      map(([leagueId, teams]) => leagueId !== null && teams.length === 0),
      distinctUntilChanged()
    );
  }

  ngOnInit(): void {
    this.leagues$.pipe(take(1)).subscribe(leagues => {
      if (leagues && leagues.length > 0 && !this.selectedLeagueId) {
        this.selectedLeagueId = leagues[0].realLeagueId;
      }
    });
  }

  getDivisionName(number: number): string {
    switch (number) {
      case 1: return 'Primera';
      case 2: return 'Segunda';
      case 3: return 'Tercera';
      default: return number + 'ª';
    }
  }

  onLeagueChange(): void {
    this.leagueChangeSubject.next(this.selectedLeagueId);
    this.selectedTeamId = null;
    this.selectedTeamsPerDivision = null;
    this.divisionChangeSubject.next(null);
  }

  onTeamsPerDivisionChange(): void {
    this.divisionChangeSubject.next(this.selectedTeamsPerDivision);
  }

  selectTeam(teamId: string): void {
    this.selectedTeamId = teamId;
  }

  seedWorld(): void {
    if (this.seedingWorld) {
      return; // debounce: ignore double-clicks while in flight
    }
    this.seedingWorld = true;
    this.error$.next(null);
    this.authService.getUserInfo().subscribe({
      next: (userInfo) => {
        this.http.post(
          `${environment.apiUrl}/world/seed-la-liga?userId=${userInfo.id}`,
          {}
        ).subscribe({
          next: () => {
            this.seedingWorld = false;
            this.refreshLeaguesTrigger.next();
          },
          error: (err) => {
            this.seedingWorld = false;
            const msg = err?.error?.message || err?.statusText || 'Error al inicializar el mundo';
            this.error$.next(`Error al inicializar el mundo: ${msg}`);
            console.error('[CAREER-SETUP] seed error:', err);
          }
        });
      },
      error: (err) => {
        this.seedingWorld = false;
        this.error$.next('No se pudo obtener el usuario actual para inicializar el mundo.');
        console.error('[CAREER-SETUP] getUserInfo error:', err);
      }
    });
  }

  async startCareer(): Promise<void> {
    if (!this.selectedLeagueId || !this.selectedTeamId || !this.selectedDifficulty || !this.selectedGameSpeed) {
      return;
    }

    try {
      this.creating = true;
      this.error$.next(null);

      const totalTeams = await firstValueFrom(this.totalTeamsInLeague$);

      const payload: any = {
        leagueId: this.selectedLeagueId,
        teamId: this.selectedTeamId,
        difficulty: this.selectedDifficulty,
        gameSpeed: this.selectedGameSpeed
      };

      if (this.selectedTeamsPerDivision && this.selectedTeamsPerDivision < totalTeams) {
        payload.teamsPerDivision = this.selectedTeamsPerDivision;
      }

      await this.http.post<{ careerId: string }>(
        `${environment.apiUrl}/career/start`, 
        payload
      ).toPromise();
      
      await this.router.navigate(['/squad']);
    } catch (err: any) {
      console.error('[CAREER-SETUP] Error starting career:', err);
      this.error$.next(err.error?.message || 'Error al iniciar carrera');
      this.creating = false;
    }
  }
}
