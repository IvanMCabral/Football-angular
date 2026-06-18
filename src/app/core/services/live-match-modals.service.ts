import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, forkJoin, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MatchEngineService } from './match-engine.service';
import { CareerService } from './career.service';
import { TeamService } from '../../features/teams/services/team.service';
import { SubModalPlayer } from './match-engine.model';
import { LineupDTO, PlayerLineupDTO } from '../../shared/models/lineup/lineup.dto';
import { SessionPlayer } from '../../shared/models/player.model';
import { SubstitutionModalComponent, SubstitutionDialogData } from '../../features/games/components/substitution-modal/substitution-modal.component';
import { FormationModalComponent, FormationDialogData } from '../../features/games/components/formation-modal/formation-modal.component';
import { MatchState } from './match-engine.model';

/**
 * LIVE-MATCH-F3-UI-LIVE FE6: shared service for opening the substitution
 * and formation modals from any live-match view (match-live per-match or
 * round-live per-round).
 *
 * <p>Centralizes the lineup/squad fetch + Modal opening so the round-live
 * match-card can emit {@code substitutionOpen} / {@code formationOpen} and
 * the round-live component just delegates to this service. Avoids
 * duplicating the ~30-line {@code openSubstitutionModal} / {@code openFormationModal}
 * code across both views.
 */
@Injectable({
  providedIn: 'root'
})
export class LiveMatchModalsService {

  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private http = inject(HttpClient);
  private careerService = inject(CareerService);
  private teamService = inject(TeamService);
  private engineService = inject(MatchEngineService);
  // LIVE-MATCH-F5.3.3 BUG-015: we need the careerId to call the
  // round-level pause/resume endpoints (`/api/v1/career/{careerId}/round/...`).
  // The careerId lives in the URL (`/games/{careerId}/...`), so we read it
  // from the Router rather than threading it through every modal caller.
  private router = inject(Router);

  /**
   * Opens the substitution modal for the given match/state. Returns the
   * subscription so the caller can `takeUntil(destroy$)` if needed.
   */
  openSubstitutionModal(matchId: string, state: MatchState): Observable<unknown> {
    if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
      this.snackBar.open('El partido ya terminó, no se puede sustituir', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    const careerId = this.getCurrentCareerId();
    return this.careerService.getCareerStatus().pipe(
      switchMap(status => {
        const userTeamId = status.userSessionTeamId;
        if (!userTeamId) {
          this.snackBar.open('No se encontró el equipo del manager', 'OK', { duration: 3000 });
          return [];
        }
        return forkJoin({
          lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
          // LIVE-MATCH-F3-UI-LIVE F5.1 BUG-001: use /teams/me/squad so the
          // server resolves the manager's own team from the JWT instead of
          // hitting the non-existent /session-teams/{id}/squad endpoint.
          squad: this.teamService.getMyTeamSquad()
        }).pipe(
          map(({ lineup, squad }) => {
            const startingIds = new Set(lineup.players.map(p => p.playerId));
            const startingXi: SubModalPlayer[] = lineup.players.map(p => this.toSubModalPlayer(p, true));
            const bench: SubModalPlayer[] = squad
              .filter(sp => !startingIds.has(sp.sessionPlayerId))
              .map(sp => this.toSubModalPlayerFromSession(sp, false));
            const data: SubstitutionDialogData = {
              matchId,
              currentMinute: state.currentMinute ?? 0,
              startingXi,
              bench,
              // Live snapshot doesn't carry substitutionsRemaining yet;
              // default to 5 (F2 per-team cap). The backend returns the
              // real count after each substitution.
              substitutionsRemaining: 5
            };
            const dialogRef = this.dialog.open(SubstitutionModalComponent, {
              data,
              width: '720px',
              maxWidth: '95vw',
              disableClose: false,
              autoFocus: 'first-tabbable'
            });

            // LIVE-MATCH-F5.3.3 BUG-015: pause the round while the modal is
            // open so the `currentMinute` the manager saw when they clicked
            // "Sustituir" is still current when they confirm. This prevents
            // the `MINUTE_IN_PAST (X) must be >= currentMinute (Y)` error
            // Iván hit on minute 81 → 73. We only pause if we could resolve
            // a careerId from the URL — otherwise we just log a warning.
            if (careerId) {
              this.engineService.pauseRoundForMatch(careerId, matchId).subscribe({
                error: (err) => console.warn('[LIVE-MATCH] pause round on sub modal open failed:', err)
              });
              dialogRef.afterClosed().subscribe(() => {
                this.engineService.resumeRoundForMatch(careerId, matchId).subscribe({
                  error: (err) => console.warn('[LIVE-MATCH] resume round on sub modal close failed:', err)
                });
              });
            } else {
              console.warn('[LIVE-MATCH] could not resolve careerId from URL; round will NOT be paused on modal open');
            }

            return data;
          })
        );
      })
    );
  }

  /** Opens the formation-change modal for the given match/state. */
  openFormationModal(matchId: string, state: MatchState): Observable<unknown> {
    if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
      this.snackBar.open('El partido ya terminó, no se puede cambiar la formación', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    const homeTeamId = state.homeTeamId;
    const currentFormation = state.homeFormation || '4-4-2';
    const careerId = this.getCurrentCareerId();
    return this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`).pipe(
      map((lineup) => {
        const currentSlots = (lineup?.players ?? []).map((p, i) => ({
          sessionPlayerId: p.playerId,
          position: p.position,
          slotIndex: i
        }));
        const data: FormationDialogData = {
          matchId,
          currentFormation,
          homeTeamId,
          currentSlots
        };
        const dialogRef = this.dialog.open(FormationModalComponent, {
          data,
          width: '520px',
          maxWidth: '95vw',
          disableClose: false,
          autoFocus: 'first-tabbable'
        });

        // LIVE-MATCH-F5.3.3 BUG-015: same pause/resume wiring as the
        // substitution modal — see openSubstitutionModal for the full
        // rationale (the `currentMinute` the manager saw at click time
        // must still be current when they confirm the formation).
        if (careerId) {
          this.engineService.pauseRoundForMatch(careerId, matchId).subscribe({
            error: (err) => console.warn('[LIVE-MATCH] pause round on formation modal open failed:', err)
          });
          dialogRef.afterClosed().subscribe(() => {
            this.engineService.resumeRoundForMatch(careerId, matchId).subscribe({
              error: (err) => console.warn('[LIVE-MATCH] resume round on formation modal close failed:', err)
            });
          });
        } else {
          console.warn('[LIVE-MATCH] could not resolve careerId from URL; round will NOT be paused on modal open');
        }

        return data;
      })
    );
  }

  /**
   * LIVE-MATCH-F5.3.3 BUG-015: extracts the careerId from the current
   * router URL. We expect URLs of the form
   * {@code /games/{careerId}/round/{round}/live} (or
   * {@code /games/{careerId}/...}); any other route returns null and the
   * caller logs a warning instead of pausing.
   */
  private getCurrentCareerId(): string | null {
    const url = this.router.url || '';
    const match = url.match(/\/games\/([^/]+)/);
    return match ? match[1] : null;
  }

  private toSubModalPlayer(p: PlayerLineupDTO, isStarter: boolean): SubModalPlayer {
    return {
      sessionPlayerId: p.playerId,
      displayName: p.name,
      position: p.position,
      rating: p.overall,
      isStarter
    };
  }

  private toSubModalPlayerFromSession(sp: SessionPlayer, isStarter: boolean): SubModalPlayer {
    const overall = Math.round(
      ((sp.attack ?? 50) +
       (sp.defense ?? 50) +
       (sp.technique ?? 50) +
       (sp.speed ?? 50) +
       (sp.stamina ?? 50) +
       (sp.mentality ?? 50)) / 6
    );
    return {
      sessionPlayerId: sp.sessionPlayerId,
      displayName: sp.name || 'Unknown',
      position: sp.position || 'MID',
      rating: overall,
      isStarter
    };
  }
}
