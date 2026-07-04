import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject, combineLatest, firstValueFrom, concat } from 'rxjs';
import { map, switchMap, catchError, take, tap, startWith, distinctUntilChanged } from 'rxjs/operators';
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
  /**
   * V25D83 sprint: teams-loading indicator. True while a league is selected
   * but {@code teamsWithOVR$} hasn't emitted its payload yet. Lets the UI
   * show an inline spinner in the team dropdown (or the divisions-preview
   * grid) while the /world/leagues/:id/teams-with-ovr HTTP is in flight.
   *
   * <p>Heuristic: we derive this from {@code combineLatest([leagueId,
   * teams])} where {@code leagueId} comes from {@code leagueChangeSubject}
   * and {@code teams} from {@code teamsWithOVR$}. Loading is when a
   * league is selected AND the teams array is empty. Empty teams with no
   * league selected is the initial state (no spinner).
   */
  loadingTeams$: Observable<boolean>;
  error$ = new BehaviorSubject<string | null>(null);

  // V25D78-C48.1: setup-flow UX gap fix. `seedingWorld` is true while POST
  // /world/seed-la-liga is in flight; the UI uses it to disable the seed button
  // and show a spinner. `refreshLeaguesTrigger` is a tick observable that, when
  // emitted, re-fetches the leagues list (used after a successful seed).
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
      })
    );

    this.teamsWithOVR$ = this.leagueChangeSubject.pipe(
      switchMap(leagueId => {
        if (!leagueId) {
          return of([]);
        }
        // V25D83 sprint: prepend an immediate empty-array emission so the
        // loadingTeams$ derived observable flips to `true` synchronously
        // on league-change (without waiting for the HTTP response). Before
        // this fix, switching leagues kept the OLD teams in the async
        // pipe until the new HTTP resolved, so loadingTeams$ would never
        // see "empty teams + selected league" and the spinner would be
        // skipped on the switch. Concat emits the seed `[]` first, then
        // subscribes to the HTTP chain.
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

    /**
     * V25D83 sprint: replace the broken `leagues === null` mapping (the
     * leagues$ source emits `League[]`, never `null`, so loading$ was
     * permanently `false` and the page-level spinner never rendered).
     * The new derivation emits `true` on subscription and flips to `false`
     * as soon as leagues$ emits its first value (success or empty). The
     * downstream `distinctUntilChanged()` collapses no-op emissions.
     */
    this.loading$ = this.leagues$.pipe(
      map(() => false),
      startWith(true),
      distinctUntilChanged()
    );

    /**
     * V25D83 sprint: teams-loading indicator. True while a league is
     * selected AND teamsWithOVR$ has not yet delivered a non-empty payload.
     * See the {@code loadingTeams$} JSDoc above for the heuristic and the
     * empty-league edge case.
     */
    this.loadingTeams$ = combineLatest([
      this.leagueChangeSubject,
      this.teamsWithOVR$
    ]).pipe(
      map(([leagueId, teams]) => leagueId !== null && teams.length === 0),
      distinctUntilChanged()
    );
  }

  /**
   * V25D82.2 sprint UX fix: pre-load teams without auto-selecting a league.
   *
   * <p>Background: with only one league available (e.g. LaLiga after the
   * C55.1 seed), the user can't easily tell the dropdown has an option to
   * pick — it looks like the setup page is stuck. The previous V25D82 fix
   * tried auto-selecting the first league, but Iván preferred to keep
   * manual control. This version triggers the {@code leagueChangeSubject}
   * with the first league's id so the {@code teamsWithOVR$} observable
   * emits, populating the team dropdown, WITHOUT changing
   * {@code selectedLeagueId}. The user still has to pick the league
   * explicitly in the dropdown before {@code startCareer()} is allowed.
   *
   * <p>Behavior:
   * <ul>
   *   <li>If {@code leagues$} emits a non-empty array, fire
   *       {@code leagueChangeSubject.next(leagues[0].realLeagueId)} so the
   *       team dropdown is populated. Do NOT touch
   *       {@code selectedLeagueId}.</li>
   *   <li>If {@code leagues$} emits an empty array (new user, world not
   *       seeded), nothing happens — the seed-world CTA already handles
   *       that case.</li>
   *   <li>If the user picks a different league manually, the dropdown's
   *       own {@code (ngModelChange)} flow via {@link onLeagueChange}
   *       re-fires {@code leagueChangeSubject} with the new id, and the
   *       team dropdown re-emits.</li>
   * </ul>
   *
   * <p>{@code take(1)} makes this a one-shot — we only want to react to
   * the first emission. Subsequent emissions (e.g. after seed-world) are
   * handled by the dropdown's own {@code (ngModelChange)} flow.
   */
  ngOnInit(): void {
    this.leagues$.pipe(take(1)).subscribe(leagues => {
      if (leagues && leagues.length > 0) {
        // V25D82.2: pre-load teams but do NOT auto-select the league.
        // selectedLeagueId stays null until the user picks from the dropdown.
        this.leagueChangeSubject.next(leagues[0].realLeagueId);
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

  /**
   * V25D78-C48.1: setup-flow UX gap fix.
   *
   * <p>REVISOR C48 V7 found that a new user can register and reach /career/setup
   * but the world has not been seeded yet (no leagues visible, dropdown empty).
   * Before this fix the user was stuck: the backend exposes POST /world/seed-la-liga
   * but no UI button or auto-trigger called it during the registration flow.
   *
   * <p>This handler is the UI-side trigger. The HTTP call sends the JWT of the
   * authenticated user via the existing authInterceptor (no need to set the
   * Authorization header manually). On 200 OK, we refresh the leagues$ observable
   * by emitting on `refreshLeaguesTrigger` so the dropdown auto-populates with
   * La Liga 2024/25 without requiring a page reload.
   */
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
            // Trigger leagues$ re-fetch so the dropdown updates with the new La Liga entry.
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

      const response = await this.http.post<{ careerId: string }>(
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
