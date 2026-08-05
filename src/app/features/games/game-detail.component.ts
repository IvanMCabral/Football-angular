import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameService } from '../../core/services/game.service';
import { Game } from '../../shared/models/game.model';
import { AuthService } from '../../core/services/auth.service';
import { CareerService } from '../../core/services/career.service';
import { MatchService } from '../../features/matches/services/match.service';
import { DashboardFixtureModalComponent } from '../dashboard/dashboard-fixture-modal.component';
import { DashboardUserInfoComponent } from '../dashboard/dashboard-user-info.component';
import { Match } from '../../shared/models/match.model';
import { readableErrorMessage } from '../../shared/utils/error-message';
import { beginMatchStartTrace, markMatchStartPointerEvent, markMatchStartStage, setMatchStartTraceMetadata } from './match-start-trace';
import { buildRoundStartNavigationState } from './round-start-navigation-state';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardFixtureModalComponent, DashboardUserInfoComponent],
  templateUrl: './game-detail.component.html',
  styleUrls: ['./game-detail.component.css']
})
export class GameDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  game?: Game;
  username = '';
  teamName = '';
  showFixtureModal = false;
  fixtureMatches: Match[] = [];
  teamNameMap: { [id: string]: string } = {};
  errorMsg = '';

  private authService = inject(AuthService);
  private careerService = inject(CareerService);
  private matchService = inject(MatchService);
  private route = inject(ActivatedRoute);
  private gameService = inject(GameService);
  private router = inject(Router);


  getValue(val: string | number | { value?: string | number | null } | null | undefined): string {
    if (val && typeof val === 'object' && 'value' in val) {
      return String(val.value ?? '');
    }
    return String(val ?? '');
  }


  playFirstRound() {
    if (!this.game) return;
    beginMatchStartTrace();
    markMatchStartStage('CLICK_HANDLER_ENTER');
    markMatchStartStage('T1_HANDLER_STARTED');
    markMatchStartStage('START_GUARD_COMPLETE');
    markMatchStartStage('PAYLOAD_BUILD_START');
    const gameId = this.getValue(this.game.id);
    const snapshot = this.careerService.getCareerStatusSnapshot?.(gameId);
    setMatchStartTraceMetadata({
      statusSnapshotAvailableAtClick: !!snapshot,
      statusSnapshotAgeMs: snapshot ? Math.max(0, Date.now() - snapshot.receivedAt) : null,
      statusHttpTriggeredByClick: false,
      fixtureSnapshotAvailableAtClick: false,
      startPayloadReadyMs: 0
    });
    markMatchStartStage('PAYLOAD_BUILD_END');
    markMatchStartStage('T2_LOCAL_VALIDATION_DONE');
    // The command is authoritative and validates phase, round and ownership.
    // Do not pay a status read before sending it.
    const advance$ = this.careerService.advanceToNextRound(gameId);
    if (!advance$) {
      // Keep lightweight test doubles and legacy embedding hosts safe; the
      // production CareerService always returns an Observable here.
      this.careerService.getCareerStatus?.().subscribe(status => {
        if (status?.careerPhase === 'PRE_MATCH' || status?.careerPhase === 'LIVE') {
          const round = status.currentRound || 1;
          markMatchStartStage('T11_NAVIGATION_REQUESTED');
          this.router.navigate(
            [`/games/${gameId}/round/${round}/live`],
            { state: buildRoundStartNavigationState(status, round, gameId) }
          );
        }
      });
      return;
    }
    markMatchStartStage('HTTP_OBSERVABLE_CREATED');
    markMatchStartStage('HTTP_SUBSCRIBE_START');
    markMatchStartStage('FETCH_XHR_DISPATCH');
    advance$.subscribe({
      next: (response) => {
        markMatchStartStage('POST_RESPONSE');
        if (response?.success && response.currentRound && response.careerPhase === 'PRE_MATCH') {
          const navigationStatus = this.buildNavigationStatus(snapshot?.value, response, gameId);
          markMatchStartStage('T11_NAVIGATION_REQUESTED');
          this.router.navigate(
            [`/games/${gameId}/round/${response.currentRound}/live`],
            { state: buildRoundStartNavigationState(navigationStatus, response.currentRound, gameId) }
          );
          return;
        }
        if (response?.tournamentFinished || response?.errorCode === 'TORNEO_FINALIZADO') {
          this.navigateAfterStatusRefresh(gameId);
          return;
        }
        this.errorMsg = response?.message || 'No se pudo preparar la siguiente fecha.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMsg = readableErrorMessage(err, 'No se pudo preparar la siguiente fecha.');
        this.cdr.markForCheck();
      }
    });
  }

  onMatchStartPointerEvent(): void {
    markMatchStartPointerEvent();
  }

  private buildNavigationStatus(snapshot: any, response: any, careerId: string): any {
    return {
      ...(snapshot ?? {}),
      careerId,
      currentRound: response.currentRound,
      totalRounds: response.totalRounds ?? snapshot?.totalRounds ?? response.currentRound,
      careerPhase: response.careerPhase ?? 'PRE_MATCH',
      season: response.season ?? snapshot?.season ?? 1
    };
  }

  private navigateAfterStatusRefresh(gameId: string): void {
    setMatchStartTraceMetadata({
      statusHttpTriggeredByClick: true,
      statusInvalidationReason: 'start-command-rejected'
    });
    this.careerService.getCareerStatus().subscribe({
      next: status => {
        if (status?.careerPhase === 'FINISHED') {
          this.router.navigate([`/games/${gameId}/champion`]);
        } else {
          this.errorMsg = 'La carrera no está lista para iniciar esta fecha.';
          this.cdr.markForCheck();
        }
      },
      error: err => {
        this.errorMsg = readableErrorMessage(err, 'No se pudo validar el estado de la carrera.');
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    // Warm the short-lived career status snapshot while the game-detail view
    // renders, so Jugar partido does not start its first status read lazily.
    // Test doubles may omit this optional warm-up method result; production
    // CareerService always returns an Observable and is warmed eagerly.
    const status$ = this.careerService.getCareerStatus();
    status$?.subscribe({ error: () => undefined });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.gameService.getGameById(id).subscribe({
        next: (game) => {
          if (!game) {
            // Defensive: back should now return 404 for missing games, but if
            // a regression sends 200+null we still surface the error state
            // instead of falling into the infinite 'Loading game details...' template.
            this.errorMsg = 'No se encontro el juego. Puede que no exista o no tengas acceso.';
            this.cdr.detectChanges();
            return;
          }
          this.game = game;
          this.cdr.detectChanges();
          // Fetch user info
          this.authService.getUserInfo().subscribe(user => {
            this.username = user.username;
            this.teamName = user.teamName || '';
            this.cdr.detectChanges();
          });
          // Fetch team name map (from CareerSave for fixture modal)
          this.careerService.getCareerTeams(id).subscribe(teams => {
            this.teamNameMap = {};
            teams.forEach(team => {
              const teamId = team.sessionTeamId || this.getValue(team.id);
              this.teamNameMap[teamId] = team.name;
            });
            this.cdr.detectChanges();
          });
        },
        error: () => {
          this.errorMsg = 'No se pudo cargar el juego. Puede que no exista o hubo un error.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.errorMsg = 'ID de juego inválido.';
      this.cdr.detectChanges();
    }
  }

  openFixtureModal() {
    if (!this.game) return;
    const gameId = this.getValue(this.game.id);
    this.matchService.getMatchesByGameId(gameId).subscribe(matches => {
      this.fixtureMatches = matches;
      this.showFixtureModal = true;
      this.cdr.detectChanges();
    });
  }

  closeFixtureModal() {
    this.showFixtureModal = false;
    this.cdr.detectChanges();
  }
}
