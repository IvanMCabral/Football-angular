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
import { PartidoModalComponent, PartidoDialogData } from '../../features/games/components/partido-modal/partido-modal.component';
import { RivalCardInfoComponent, RivalCardInfoDialogData } from '../../features/games/components/rival-card-info/rival-card-info.component';
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
   * V25D81-BUG #3: optional overrides for {@link openSubstitutionModal}.
   * Currently used by the round-live INJURY auto-listener to pre-select
   * the injured player and surface the reason in the modal header. Both
   * fields are optional — manual opens pass `undefined` and get the
   * legacy "click-to-pick" UX.
   */
  openSubstitutionOptions?: {
    /**
     * sessionPlayerId to pre-select as the OFF player when the modal
     * opens. The modal auto-fills the OFF field; the manager only picks
     * the ON (bench) player and confirms. If the id is not in the
     * starting XI (e.g. already substituted off), the auto-select is a
     * silent no-op.
     */
    preSelectedPlayerId?: string;
    /**
     * Why the modal is opening. When set, the modal renders a small
     * reason banner in the header. Currently only
     * `INJURY_FORCED_SUBSTITUTION` is emitted by the auto-listener;
     * manual opens leave this `undefined` (renders the bare title).
     */
    reason?: 'INJURY_FORCED_SUBSTITUTION' | 'MANUAL';
  };

  /**
   * Opens the substitution modal for the given match/state. Returns the
   * subscription so the caller can `takeUntil(destroy$)` if needed.
   *
   * <p>V25D81-BUG #3: optional {@link openSubstitutionOptions} parameter
   * for the INJURY auto-modal flow. Manual opens pass `undefined` and
   * get the same UX as before (manager picks the OFF player themselves).
   */
  openSubstitutionModal(
    matchId: string,
    state: MatchState,
    options?: LiveMatchModalsService['openSubstitutionOptions']
  ): Observable<unknown> {
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
            // V25D75-C40 B1: dedupe starting XI by playerId (some upstream
            // paths can return duplicates — modal would show 22 entries per
            // column). Same for bench by sessionPlayerId. Pick first occurrence.
            const seenStarters = new Set<string>();
            const startingXi: SubModalPlayer[] = lineup.players
              .filter(p => {
                if (!p.playerId || seenStarters.has(p.playerId)) { return false; }
                seenStarters.add(p.playerId);
                return true;
              })
              .map(p => this.toSubModalPlayer(p, true));
            const startingIds = seenStarters;
            const seenBench = new Set<string>();
            const bench: SubModalPlayer[] = squad
              .filter(sp => !startingIds.has(sp.sessionPlayerId))
              .filter(sp => {
                if (!sp.sessionPlayerId || seenBench.has(sp.sessionPlayerId)) { return false; }
                seenBench.add(sp.sessionPlayerId);
                return true;
              })
              .map(sp => this.toSubModalPlayerFromSession(sp, false));

            // V25D63-C23 P0: construir effectivenessMap (sessionPlayerId → eff)
            // invirtiendo formationEffectiveness.perPlayerEffectiveness (keyed
            // subdivisionId) via lineup.slots. Si formationEffectiveness es null
            // (legacy pre-V25D47) o slots está ausente, el map queda {} y el
            // modal renderiza sin feedback de effectiveness (legacy fallback OK,
            // replicando squad-editor-modal behavior).
            const slotToEff: Record<string, number> =
              lineup?.formationEffectiveness?.perPlayerEffectiveness ?? {};
            const slotToPlayerId: Record<string, string> = {};
            (lineup?.slots ?? []).forEach(s => {
              slotToPlayerId[s.subdivisionId] = s.playerId;
            });
            const effectivenessMap: Record<string, number> = {};
            Object.entries(slotToEff).forEach(([subdivisionId, eff]) => {
              const playerId = slotToPlayerId[subdivisionId];
              if (playerId) {
                effectivenessMap[playerId] = eff;
              }
            });

            const data: SubstitutionDialogData = {
              matchId,
              currentMinute: state.currentMinute ?? 0,
              startingXi,
              bench,
              // V25D79 (D5): substitutionsRemaining sourced from the live
              // SSE snapshot. The backend computes it from the SUBSTITUTION
              // event count with a 5-per-match cap (floored at 0). Falls
              // back to the cap (5) when the feed hasn't arrived yet — the
              // modal's isOutOfSubs gate will refuse to register selections
              // when the counter is 0.
              substitutionsRemaining: state.substitutionsRemaining ?? 5,
              // V25D63-C23 P0: position-effectiveness feedback para chips SALE/ENTRA.
              effectivenessMap,
              // V25D79: pass formation + per-player live stats + which side
              // the manager team is playing on. The modal visual pitch and
              // the per-dot chips consume these. Falls back to defaults when
              // the SSE feed hasn't arrived yet (legacy pre-V25D79 snapshots).
              formation: (userTeamId === state.homeTeamId)
                  ? (state.homeFormation ?? '4-4-2')
                  : (state.awayFormation ?? '4-4-2'),
              playerRatings: (userTeamId === state.homeTeamId)
                  ? (state.homePlayerRatings ?? [])
                  : (state.awayPlayerRatings ?? []),
              managerSide: (userTeamId === state.homeTeamId) ? 'HOME' : 'AWAY',
              // V25D81-BUG #3: auto-modal pre-select + reason from the
              // round-live INJURY listener. Both optional; manual opens
              // pass undefined and get the legacy UX.
              preSelectedPlayerId: options?.preSelectedPlayerId,
              reason: options?.reason
            };

            // LIVE-MATCH-F5.3.3 BUG-015: pause the round BEFORE the dialog
            // opens so the `currentMinute` the manager saw when they clicked
            // "Sustituir" is still current when they confirm. This prevents
            // the `MINUTE_IN_PAST (X) must be >= currentMinute (Y)` error
            // Iván hit on minute 81 → 73. We fire-and-forget the pause call:
            // waiting for the response before opening the dialog would add
            // ~50-100ms of perceived lag, and the backend is idempotent so
            // a transient pause failure is recoverable (the next tick will
            // re-pause if the modal is still open). We only pause if we
            // could resolve a careerId from the URL — otherwise we log a
            // warning and open the modal anyway.
            if (careerId) {
              this.engineService.pauseRoundForMatch(careerId, matchId).subscribe({
                error: (err) => console.warn('[LIVE-MATCH] pause round on sub modal open failed:', err)
              });
            } else {
              console.warn('[LIVE-MATCH] could not resolve careerId from URL; round will NOT be paused on modal open');
            }

            const dialogRef = this.dialog.open(SubstitutionModalComponent, {
              data,
              width: '720px',
              maxWidth: '95vw',
              disableClose: false,
              autoFocus: 'first-tabbable'
            });

            // LIVE-MATCH-F5.3.3 BUG-015: resume the round when the modal
            // closes (whether the manager confirmed OR cancelled).
            if (careerId) {
              dialogRef.afterClosed().subscribe(() => {
                this.engineService.resumeRoundForMatch(careerId, matchId).subscribe({
                  error: (err) => console.warn('[LIVE-MATCH] resume round on sub modal close failed:', err)
                });
              });
            }

            return data;
          })
        );
      })
    );
  }

  /**
   * V25D81.1 BUG #3: opens a small awareness dialog when the rival receives
   * a red card. The dialog carries only display info (player name + minute)
   * and does NOT trigger any auto-substitution — the manager still has to
   * explicitly open the substitution modal if they want to react. This is
   * the "awareness without action" UX path Iván asked for after F0 #3.
   *
   * <p>Returns an Observable that completes when the manager closes the
   * dialog. The component does not pause/resume the round — the modal is
   * informational and should not interfere with the live ticker.
   */
  openRivalCardInfoModal(
    matchId: string,
    state: MatchState,
    info: { playerName: string; minute: number; cardType: 'RED' }
  ): Observable<unknown> {
    const data: RivalCardInfoDialogData = {
      playerName: info.playerName,
      minute: info.minute,
      cardType: info.cardType
    };
    const dialogRef = this.dialog.open(RivalCardInfoComponent, {
      data,
      width: '420px',
      maxWidth: '95vw',
      disableClose: false,
      autoFocus: 'first-tabbable'
    });
    return dialogRef.afterClosed();
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
    // V25D81-BUG #4: also fetch the squad so the drag-drop modal can
    // render player names + a bench list. Same pattern as
    // openSubstitutionModal (lineup + squad forkJoin).
    return forkJoin({
      lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
      squad: this.teamService.getMyTeamSquad()
    }).pipe(
      map(({ lineup, squad }) => {
        const currentSlots = (lineup?.players ?? []).map((p, i) => ({
          sessionPlayerId: p.playerId,
          position: p.position,
          slotIndex: i
        }));
        // V25D81-BUG #4: startingIds = sessionPlayerIds in the current
        // lineup. The modal uses this to split the squad into
        // "on pitch" (in currentSlots) and "bench" (squad minus
        // starting) when the drag-drop bench column is rendered.
        const startingIds = new Set<string>(
          currentSlots.map(s => s.sessionPlayerId).filter(id => !!id)
        );
        const data: FormationDialogData = {
          matchId,
          currentFormation,
          homeTeamId,
          currentSlots,
          squad: squad ?? [],
          startingIds
        };

        // LIVE-MATCH-F5.3.3 BUG-015: pause the round BEFORE the dialog
        // opens. Same wire as openSubstitutionModal — see that method
        // for the full rationale (the `currentMinute` the manager saw at
        // click time must still be current when they confirm).
        if (careerId) {
          this.engineService.pauseRoundForMatch(careerId, matchId).subscribe({
            error: (err) => console.warn('[LIVE-MATCH] pause round on formation modal open failed:', err)
          });
        } else {
          console.warn('[LIVE-MATCH] could not resolve careerId from URL; round will NOT be paused on modal open');
        }

        const dialogRef = this.dialog.open(FormationModalComponent, {
          data,
          width: '720px',           // V25D81-BUG #4: wider for the drag-drop bench column
          maxWidth: '95vw',
          disableClose: false,
          autoFocus: 'first-tabbable'
        });

        // LIVE-MATCH-F5.3.3 BUG-015: resume on afterClosed (confirm or cancel).
        if (careerId) {
          dialogRef.afterClosed().subscribe(() => {
            this.engineService.resumeRoundForMatch(careerId, matchId).subscribe({
              error: (err) => console.warn('[LIVE-MATCH] resume round on formation modal close failed:', err)
            });
          });
        }

        return data;
      })
    );
  }

  /**
   * V25D89-FRONT-A: opens the Partido modal for the given match/state.
   * The Partido modal is the new dual-tab entry point (Mi Formación editable
   * + Formación Rival read-only) that supersedes neither the F5 formation
   * modal nor the F4 substitution modal — those two modals stay available
   * per parent direction (KEEP existing Formación button OK). The Partido
   * modal is the single "match view" the manager opens when they want to
   * see the tactical matchup at a glance.
   *
   * <p>Data wiring mirrors {@link openFormationModal}: lineup + squad
   * forkJoin, then build the dialog data with the addition of
   * {@code rivalFormation} sourced from
   * {@code state.awayFormation}. Pause/resume round follows the same
   * F5.3.3 BUG-015 pattern: pause BEFORE the dialog opens so the
   * `currentMinute` the manager saw at click time is still current when
   * they confirm; resume on afterClosed() whether the manager confirmed
   * OR discarded.
   */
  openPartidoModal(matchId: string, state: MatchState): Observable<unknown> {
    if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
      this.snackBar.open('El partido ya terminó, no se puede editar la formación', 'OK', { duration: 3000 });
      return new Observable(sub => sub.complete());
    }
    const careerId = this.getCurrentCareerId();
    return forkJoin({
      lineup: this.http.get<LineupDTO>(`${environment.apiUrl}/career/lineup/current`),
      squad: this.teamService.getMyTeamSquad()
    }).pipe(
      map(({ lineup, squad }) => {
        const currentSlots = (lineup?.players ?? []).map((p, i) => ({
          sessionPlayerId: p.playerId,
          position: p.position,
          slotIndex: i
        }));
        const startingIds = new Set<string>(
          currentSlots.map(s => s.sessionPlayerId).filter(id => !!id)
        );
        const data: PartidoDialogData = {
          matchId,
          // V25D89-FRONT-A: same currentFormation source as openFormationModal
          // (home formation when the manager team is home, else away).
          // The Partido modal uses this to seed the dropdown + slot re-flow.
          currentFormation: state.homeFormation || '4-4-2',
          homeTeamId: state.homeTeamId,
          currentSlots,
          squad: squad ?? [],
          startingIds,
          // V25D89-FRONT-A: rival formation comes from state.awayFormation
          // (the only rival-side data the SSE feed exposes). Falls back to
          // '4-4-2' defensively so the rival tab always renders.
          rivalFormation: state.awayFormation || '4-4-2'
        };

        // LIVE-MATCH-F5.3.3 BUG-015: pause the round BEFORE the dialog
        // opens (same wire as openFormationModal — see that method for
        // the full rationale).
        if (careerId) {
          this.engineService.pauseRoundForMatch(careerId, matchId).subscribe({
            error: (err) => console.warn('[LIVE-MATCH] pause round on partido modal open failed:', err)
          });
        } else {
          console.warn('[LIVE-MATCH] could not resolve careerId from URL; round will NOT be paused on modal open');
        }

        const dialogRef = this.dialog.open(PartidoModalComponent, {
          data,
          width: '720px',
          maxWidth: '95vw',
          disableClose: false,
          autoFocus: 'first-tabbable'
        });

        // LIVE-MATCH-F5.3.3 BUG-015: resume on afterClosed (confirm or discard).
        if (careerId) {
          dialogRef.afterClosed().subscribe(() => {
            this.engineService.resumeRoundForMatch(careerId, matchId).subscribe({
              error: (err) => console.warn('[LIVE-MATCH] resume round on partido modal close failed:', err)
            });
          });
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
