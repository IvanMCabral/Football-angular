import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { WorldCatalogService } from '../../core/services/world-catalog.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { environment } from '../../environments/environment';
import { readableErrorMessage } from '../../shared/utils/error-message';
import { Observable, BehaviorSubject, combineLatest, firstValueFrom, concat } from 'rxjs';
import { map, switchMap, catchError, take, startWith, distinctUntilChanged, shareReplay, filter } from 'rxjs/operators';
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

interface StartCareerPayload {
  leagueId: string;
  teamId: string;
  difficulty: string;
  gameSpeed: string;
  teamsPerDivision?: number;
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
  private refreshTeamsTrigger = new BehaviorSubject<void>(undefined);
  private teamsLoadedSubject = new BehaviorSubject<boolean>(false);

  private _selectedLeagueId: string | null = null;
  
  get selectedLeagueId(): string | null {
    return this._selectedLeagueId;
  }
  
  set selectedLeagueId(value: string | null) {
    this._selectedLeagueId = value;
    this.selectedTeamId = null;
    this.selectedTeamsPerDivision = null;
    this.teamsLoadedSubject.next(false);
    this.divisionChangeSubject.next(null);
    this.leagueChangeSubject.next(value);
  }
  
  selectedTeamId: string | null = null;
  selectedDifficulty: string | null = null;
  selectedGameSpeed: string | null = null;
  selectedTeamsPerDivision: number | null = null;
  creating = false;
  readonly worldRequestTimeoutMs = 25_000;
  
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
    private authService: AuthService,
    private catalogService: WorldCatalogService,
    private logger: AppLoggerService
  ) {
    this.leagues$ = combineLatest([this.refreshLeaguesTrigger]).pipe(
      switchMap(() => this.catalogService.leagues()),
      catchError(err => {
        this.error$.next('No se pudo cargar el mundo. Revisá tu conexión y reintentá.');
        return of([]);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.teamsWithOVR$ = combineLatest([
      this.leagueChangeSubject,
      this.refreshTeamsTrigger
    ]).pipe(
      switchMap(([leagueId]) => {
        this.teamsLoadedSubject.next(false);
        if (!leagueId) {
          this.teamsLoadedSubject.next(true);
          return of([]);
        }
        // Emit an empty list first so the UI can show the team-loading state immediately.
        return concat(
          of([] as TeamWithOVR[]),
          this.authService.getUserInfo().pipe(
            switchMap(() => this.catalogService.teamsForLeague(leagueId, this.worldRequestTimeoutMs)),
            catchError(err => {
              this.error$.next('Error al cargar equipos');
              return of([] as TeamWithOVR[]);
            }),
            map(teams => {
              this.teamsLoadedSubject.next(true);
              return teams;
            })
          )
        );
      }),
      // The template consumes this stream through several independent
      // projections. Keep one authenticated catalog request per selection.
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.divisionPreviews$ = combineLatest([
      this.divisionChangeSubject,
      this.leagueChangeSubject
    ]).pipe(
      distinctUntilChanged(([previousTeams, previousLeague], [teams, league]) =>
        previousTeams === teams && previousLeague === league),
      switchMap(([teamsPerDivision, leagueId]) => {
        if (!teamsPerDivision || !leagueId) {
          return of<DivisionPreview[]>([]);
        }
        return this.catalogService.divisionPreview(leagueId, teamsPerDivision).pipe(
          catchError(err => {
            this.error$.next('Error al calcular preview de divisiones');
            return of<DivisionPreview[]>([]);
          })
        );
      }),
      // Division previews are derived from the same selection state and must
      // not rebuild the world snapshot once per async pipe subscriber.
      shareReplay({ bufferSize: 1, refCount: false })
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
      this.teamsLoadedSubject
    ]).pipe(
      map(([leagueId, loaded]) => leagueId !== null && !loaded),
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

  retryWorldLoad(): void {
    this.error$.next(null);
    this.catalogService.invalidate();
    this.refreshLeaguesTrigger.next();
    this.refreshTeamsTrigger.next();
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
    this.catalogService.initializeWorld().subscribe({
      next: () => {
        this.seedingWorld = false;
        this.catalogService.invalidate();
        this.refreshLeaguesTrigger.next();
        this.refreshTeamsTrigger.next();
      },
      error: (err) => {
        this.seedingWorld = false;
        const msg = readableErrorMessage(err, 'Error al inicializar el mundo.');
        this.error$.next(`Error al inicializar el mundo: ${msg}`);
        this.logger.error('[CAREER-SETUP] world initialization error:', err);
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

      const totalTeams = await firstValueFrom(this.totalTeamsInLeague$.pipe(
        filter(total => total > 0),
        take(1)
      ));

      const payload: StartCareerPayload = {
        leagueId: this.selectedLeagueId,
        teamId: this.selectedTeamId,
        difficulty: this.selectedDifficulty,
        gameSpeed: this.selectedGameSpeed,
        teamsPerDivision: this.selectedTeamsPerDivision && this.selectedTeamsPerDivision < totalTeams
          ? this.selectedTeamsPerDivision
          : totalTeams
      };

      await this.http.post<{ careerId: string }>(
        `${environment.apiUrl}/career/start`, 
        payload
      ).toPromise();
      
      await this.router.navigate(['/squad']);
    } catch (err: unknown) {
      this.logger.error('[CAREER-SETUP] Error starting career:', err);
      this.error$.next(readableErrorMessage(err, 'Error al iniciar carrera.'));
      this.creating = false;
    }
  }
}
