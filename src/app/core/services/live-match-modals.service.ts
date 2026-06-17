import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
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

  /**
   * Opens the substitution modal for the given match/state. Returns the
   * subscription so the caller can `takeUntil(destroy$)` if needed.
   */
  openSubstitutionModal(matchId: string, state: MatchState): Observable<unknown> {
    if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
      this.snackBar.open('El partido ya terminó, no se puede sustituir', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    return this.careerService.getCareerStatus().pipe(
      switchMap(status => {
        const userTeamId = status.userSessionTeamId;
        if (!userTeamId) {
          this.snackBar.open('No se encontró el equipo del manager', 'OK', { duration: 3000 });
          return [];
        }
        return forkJoin({
          lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
          squad: this.teamService.getSessionTeamSquad(userTeamId)
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
            this.dialog.open(SubstitutionModalComponent, {
              data,
              width: '720px',
              maxWidth: '95vw',
              disableClose: false,
              autoFocus: 'first-tabbable'
            });
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
        this.dialog.open(FormationModalComponent, {
          data,
          width: '520px',
          maxWidth: '95vw',
          disableClose: false,
          autoFocus: 'first-tabbable'
        });
        return data;
      })
    );
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
