import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { MatchEngineService } from '../../../../core/services/match-engine.service';
import { ALL_FORMATIONS, FormationCode } from '../../../../shared/constants/formations';
import { SessionPlayer } from '../../../../shared/models/player.model';
import { MatchEvent } from '../../../../core/services/match-engine.model';

/**
 * V25D89.2 (stats live): a single row in the stats grid. Each row maps
 * one MatchEvent-derived counter to its home/away value. {@link label}
 * is the display string ("Posesión", "Tiros totales", etc.), {@link home}
 * and {@link away} are the formatted values ("55%", "8", "0", etc.).
 *
 * <p>Why a single shape instead of 8 separate getters: the template binds
 * to {@code statsRows()} via {@code *ngFor} — keeping the row shape flat
 * means the grid layout (label + home + away) renders identically for
 * every stat without per-stat conditional markup.
 */
export interface PartidoStatRow {
  label: string;
  home: string;
  away: string;
}

export interface PartidoDialogData {
  matchId: string;
  /** Current formation string (e.g. "4-4-2") for the manager team. */
  currentFormation: string;
  homeTeamId: string;
  /**
   * V25D89.2: rival team sessionTeamId, needed so the stats derivation
   * can attribute events to home vs away (without it we cannot tell which
   * shots belong to which side). Sourced from {@code state.awayTeamId}
   * via {@link LiveMatchModalsService.openPartidoModal}.
   */
  awayTeamId?: string;
  /** Manager-side current slots (sessionPlayerId + position + slotIndex). */
  currentSlots: Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
  }>;
  /** Manager squad (starters + bench combined). */
  squad: SessionPlayer[];
  /** sessionPlayerIds currently in the starting XI (subset of squad). */
  startingIds: Set<string>;
  /**
   * V25D89-FRONT-A: rival formation string (e.g. "4-3-3") sourced from
   * {@code state.awayFormation}. Read-only — the AI controls the rival.
   * The rival tab renders this formation's pitch layout (role labels only,
   * no player names because the rival XI is not exposed by the SSE feed —
   * see report section 1.3 / known-limitation V25D89.1).
   */
  rivalFormation: string;
  /**
   * V25D89.2: live minute at modal-open, sourced from
   * {@code state.currentMinute}. Drives the stats header tag ("Minuto 47").
   * Optional — defaults to 0 when the SSE feed hasn't reached tick 1 yet
   * (modal opens while the match is still NOT_STARTED in rare cases).
   */
  currentMinute?: number;
  /**
   * V25D89.2: current score from {@code state.score}. Drives the goals row
   * in the stats grid (the only stat we trust more than the event count
   * — score.home/away is the canonical source, not GOAL events). Optional
   * with default {0,0}.
   */
  score?: { home: number; away: number };
  /**
   * V25D89.2: live possession 0-100 from BE1 (LIVE-MATCH-F3-UI-LIVE). The
   * Posesión row uses these verbatim — the event list doesn't carry a
   * possession sample, so we MUST read it from the snapshot.
   */
  homePossession?: number;
  awayPossession?: number;
  /**
   * V25D89.2: human-readable team names. When missing the modal falls
   * back to the teamIds (less readable but still functional). Sourced
   * from the round-live {@code teamNameMap} via the 3rd param of
   * {@link LiveMatchModalsService.openPartidoModal}.
   */
  homeTeamName?: string;
  awayTeamName?: string;
  /**
   * V25D89.2: full event timeline from {@code state.events}. Used to
   * derive shots/corners/fouls/yellow/red + populate the recent events
   * timeline. When empty (pre-kickoff) the stats section shows a graceful
   * "disponibles cuando arranque el partido" message instead of zeros.
   */
  events?: MatchEvent[];
  /**
   * V25D89.2: subs the manager team can still make (V25D79 D5 source of
   * truth). Rendered as a chip "Subs: 3/5" in the stats header so the
   * manager knows at a glance how many changes they have left.
   */
  substitutionsRemaining?: number;
}

/**
 * V25D89-FRONT-A: per-formation role labels por dot. Mirrors the same map
 * in {@code formation-modal.component.ts} (F5) so the manager-side and
 * rival-side pitches use the same role vocabulary. Kept in sync by hand —
 * any formation added to {@link FORMATION_LINES_BY_FORMATION} in the F5
 * modal must be added here too (or vice-versa). The 12 formations match
 * {@link ALL_FORMATIONS}.
 */
const FORMATION_LINES_BY_FORMATION: Record<string, string[][]> = {
  '4-4-2':       [['GK'], ['LB', 'CB', 'CB', 'RB'], ['LM', 'CM', 'CM', 'RM'], ['ST', 'ST']],
  '4-3-3':       [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CM', 'CM', 'CM'], ['LW', 'ST', 'RW']],
  '3-5-2':       [['GK'], ['CB', 'CB', 'CB'], ['LWB', 'CM', 'CM', 'CM', 'RWB'], ['ST', 'ST']],
  '4-2-3-1':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM', 'CDM'], ['LW', 'CAM', 'RW'], ['ST']],
  '5-3-2':       [['GK'], ['LB', 'CB', 'CB', 'CB', 'RB'], ['CM', 'CM', 'CM'], ['ST', 'ST']],
  '4-1-4-1':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM'], ['LM', 'CM', 'CM', 'RM'], ['ST']],
  '3-4-3':       [['GK'], ['CB', 'CB', 'CB'], ['LWB', 'CM', 'CM', 'RWB'], ['LW', 'ST', 'RW']],
  '3-5-2-CDM':   [['GK'], ['CB', 'CB', 'CB'], ['CDM'], ['CM', 'CM'], ['LWB', 'RWB'], ['ST', 'ST']],
  '5-4-1':       [['GK'], ['LB', 'CB', 'CB', 'CB', 'RB'], ['LM', 'CM', 'CM', 'RM'], ['ST']],
  '3-4-1-2':     [['GK'], ['CB', 'CB', 'CB'], ['LWB', 'CM', 'CM', 'RWB'], ['CAM'], ['ST', 'ST']],
  '4-2-2-2':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM', 'CDM'], ['LM', 'RM'], ['ST', 'ST']],
  '4-3-3-1':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM'], ['CM', 'CM'], ['LW', 'ST', 'RW']]
};

/**
 * V25D89-FRONT-A: Partido modal — unified "Partido" entry point that
 * shows BOTH the manager's formation (editable) AND the rival's formation
 * (read-only) in a single modal.
 *
 * <p>Two tabs via {@code mat-tab-group}:
 * <ul>
 *   <li><b>"Mi Formación"</b> — editable pitch with drag-and-drop,
 *       formation dropdown, auto-fill bench. Reuses the SAME slot→player
 *       data flow as the existing F5
 *       {@code FormationModalComponent}. Why not embed the F5 component
 *       directly? Because {@code FormationModalComponent} injects
 *       {@code MAT_DIALOG_DATA} + {@code MatDialogRef} (a MatDialog leaf
 *       component), and providing stub tokens to it inside another
 *       MatDialog is brittle — every F5 close() call would need a
 *       re-emit bridge to the parent. Reimplementing the pitch+drag
 *       logic here is bounded duplication (~150 lines) and keeps F5
 *       untouched. The F5 spec continues to test the formation flow
 *       independently, and this spec tests the partido flow.</li>
 *   <li><b>"Formación Rival"</b> — read-only pitch with the rival's
 *       formation string. Dots are grayed out + show only role labels
 *       (no player names because the rival XI is not exposed by the
 *       SSE feed — known-limitation V25D89.1 follow-up). Banner at the
 *       top: "🤖 Lo maneja la IA — no editable durante el partido".</li>
 * </ul>
 *
 * <p>Footer: <b>"Descartar"</b> closes the modal without saving;
 * <b>"Guardar"</b> POSTs the formation change to the backend via
 * {@code MatchEngineService.changeFormation} and then closes.
 *
 * <p>Save semantics: matches the F5 modal. {@code autoFillEmptySlots}
 * fills every empty slot from the bench before POSTing (with a lock
 * badge for auto-filled slots, same as F5). On success, snackbar
 * shows "Formación cambiada a {formation}" and dialog closes with
 * {@code success: true}. On error, the inline error banner surfaces
 * the backend's error message and the modal stays open so the manager
 * can correct.
 *
 * <p>V25D89-FRONT-A: NO backend changes — the formation endpoint
 * {@code POST /api/v1/match-engine/matches/{matchId}/formation} already
 * exists (see {@code FormationChangeController.java}) and is the same
 * one F5 calls.
 *
 * <p>V25D56-style inlined styles: {@code styles: [...]} instead of
 * {@code styleUrls: [...]} so {@code ɵcmp.styles} exposes the CSS
 * source to unit tests (per angular-testing-patterns memory — the
 * .css companion file is kept for IDE hints only).
 */
@Component({
  selector: 'app-partido-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './partido-modal.component.html',
  // V25D56 (Sprint C17) + V25D79 (Sprint C18) convention: NO `styleUrls`
  // because the Karma/test webpack config does not have a CSS loader
  // (only `styles: [...]` inline arrays work). The .css companion file
  // is kept on disk for IDE hints only — see partido-modal.component.css.
  styles: [`
    /* V25D89.4-FRONT: full-width modal. The V25D89.3 cap (540px) made
       the modal look like it floated in a corner of the viewport on
       desktop — Iván saw ~40-50% of empty white space to the right of
       a 540px modal on a 1920px screen. New target: use 95% of the
       viewport width so the pitch + bench + stats + events layout
       has room to breathe. We keep the V25D89.3 compact spacing for
       internal padding/margins — only the outer container expands. */
    .partido-modal-root {
      min-width: 0;
      max-width: 100%;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    /* V25D89.4-FRONT: override Angular Material MDC dialog container
       to fill the viewport instead of capping at 540px. Both width AND
       max-width are set so the dialog actually takes the requested
       width (Material's default behavior with max-width alone leaves
       the container at content-size). align-self: center ensures the
       expanded container stays horizontally centered in the overlay
       pane (Material defaults to flex-start which is what produced
       the "modal pegado a la izquierda" appearance). */
    :host ::ng-deep .mat-mdc-dialog-container {
      max-width: 95vw;
      width: 95vw;
      align-self: center;
    }

    /* V25D89.3-FRONT: override Angular Material MDC dialog default
       padding so the title bar and content hug the modal edges.
       Without these overrides Material adds ~24px padding around the
       title and the content body — that's the bulk of the "espacio
       blanco lateral / superior" Iván saw in the V25D89.2 screenshot.
       V25D89.4: also cap max-height + enable vertical scroll so the
       expanded modal doesn't overflow the viewport on shorter screens
       (the pitch + bench + stats + events stack can exceed 100vh on
       laptops with the height of the formation pitch + stats header +
       8 stat rows + 6 events + footer). */
    :host ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-title {
      padding: 0;
      margin: 0;
    }
    :host ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-content {
      padding: 0;
      max-height: 80vh;
      overflow-y: auto;
    }
    :host ::ng-deep .mat-mdc-dialog-container h2.mat-mdc-dialog-title {
      padding: 0.4rem 0.75rem 0.3rem;
      margin: 0;
    }
    :host ::ng-deep .mat-mdc-dialog-container .mat-mdc-tab-body-content {
      padding: 0.35rem 0.6rem 0.5rem;
      overflow: hidden;
    }
    :host ::ng-deep .mat-mdc-dialog-container .mdc-dialog__content {
      padding: 0;
    }

    .title-icon { margin-right: 0.4rem; }

    .minute-tag {
      display: inline-block;
      margin-left: 0.6rem;
      padding: 0.15rem 0.5rem;
      background: #e0e0e0;
      color: #1e3c72;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      vertical-align: middle;
    }

    /* V25D90-FRONT-F3: score chip in the modal title bar — sits between
       the icon and the minute tag. Same pill visual vocabulary as the
       minute tag so the title looks like a single coherent chip row.
       Background uses the score-themed green (not the neutral grey of
       the minute tag) so the eye lands on it first — it's the most
       information-dense element of the modal. */
    .score-chip {
      display: inline-block;
      margin-left: 0.5rem;
      padding: 0.2rem 0.65rem;
      background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
      color: #fff;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 700;
      vertical-align: middle;
      letter-spacing: 0.04em;
      min-width: 2.6rem;
      text-align: center;
    }

    .partido-modal-content { padding-top: 0; padding-bottom: 0; }

    /* V25D89-FRONT-A: banner styling mirrors the F5 modal's banner so
       the look-and-feel is consistent across both modal entry points. */
    .banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      font-size: 0.85rem;
      margin-bottom: 0.35rem;
    }
    .banner mat-icon {
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }
    .banner-error {
      background: #ffebee;
      color: #b71c1c;
      border: 1px solid #ffcdd2;
    }
    .banner-warning {
      background: #fff8e1;
      color: #8a5300;
      border: 1px solid #ffe0a0;
    }
    /* V25D89-FRONT-A: AI-managed banner for the rival tab. Blue tone to
       distinguish from red error / yellow warning. */
    .banner-info-ai {
      background: #e3f2fd;
      color: #0d47a1;
      border: 1px solid #bbdefb;
    }

    /* ========== Visual pitch (shared between manager + rival tabs) ========== */

    .formation-row {
      display: flex;
      justify-content: center;
      margin-bottom: 0.3rem;
    }

    .formation-select {
      width: 100%;
      max-width: 220px;
    }

    /* V25D89.1-FRONT: pitch now has halfway line + center circle drawn
       via ::before / ::after pseudo-elements so the manager can read the
       formation at a glance (lines act as visual anchors for "two halves"
       and "midfield zone"). The white pitch border already provides the
       touch-lines and goal-lines. Pure CSS — no DOM change, no new
       assets, scales with the modal width. */
    .pitch {
      position: relative;
      background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%);
      border-radius: 8px;
      padding: 0.5rem 0.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      border: 2px solid #fff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
      /* V25D90-FRONT-F2: 280px → 380px so the larger 56x56 dots
         (4 lines × 64px pitch-line + 3 gaps × ~5px + 2 padding ×
         8px ≈ 285px of inner content) don't crowd the pitch border.
         380px leaves ~95px of headroom for the center circle + the
         halfway line pseudo-elements. */
      min-height: 380px;
      justify-content: space-around;
      margin-bottom: 0.25rem;
      overflow: hidden;
    }
    /* Halfway line — horizontal stripe at 50% height, full pitch width.
       White at 65% opacity so the player dots stay legible on top. */
    .pitch::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1.5px;
      background: rgba(255, 255, 255, 0.65);
      transform: translateY(-50%);
      pointer-events: none;
      z-index: 0;
    }
    /* Center circle — fixed 64×64 px ring so it stays circular on any
       modal width. Centered on the pitch; visually anchors the midfield
       line in the formation layout. pointer-events:none so drag/drop
       on the dots still works. */
    .pitch::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 56px;
      height: 56px;
      border: 1.5px solid rgba(255, 255, 255, 0.65);
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
    }
    /* Lift pitch lines above the pseudo-element lines so dots are visible. */
    .pitch > .pitch-line {
      position: relative;
      z-index: 1;
    }

    .pitch-line {
      display: flex;
      justify-content: space-around;
      align-items: center;
      /* V25D90-FRONT-F2: bumped from 30px to 64px so the larger 56x56
         player-dots (F2) have room without clipping the role label
         below the name. The extra headroom also keeps drag targets
         comfortable on touch devices. */
      min-height: 64px;
    }

    .player-dot {
      /* V25D90-FRONT-F2: 30px → 56px so the full player name (e.g.
         "Bellingham", "Vinícius", "Mbappé") fits without aggressive
         ellipsis. The 56px width lets ~7 chars fit on one line at
         0.65rem; longer names wrap to 2 lines (white-space: normal
         on .dot-player-name below). Height matches width for a true
         circle, but the column-flex layout (name + role) means the
         inner content drives the actual visual height. */
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      padding: 3px 2px;
      border: 2px solid #1e3c72;
      font-size: 0.7rem;
      font-weight: 700;
      color: #1e3c72;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      cursor: grab;
      user-select: none;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
      position: relative;
    }
    .player-dot:active { cursor: grabbing; }

    .player-dot.is-gk  { background: #ffc107; border-color: #ff6f00; }
    .player-dot.is-def { background: #bbdefb; }
    .player-dot.is-mid,
    .player-dot.is-mid2 { background: #c8e6c9; }
    .player-dot.is-att { background: #ffcdd2; border-color: #b71c1c; color: #b71c1c; }

    .player-dot.is-empty {
      background: #f5f7fa;
      border-style: dashed;
      color: #5a6473;
    }

    .player-dot.is-drag-source {
      transform: scale(0.92);
      box-shadow: 0 0 0 3px #d32f2f, 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* V25D89-FRONT-A: auto-fill lock badge (same as F5 modal). */
    .player-dot.is-auto-filled {
      box-shadow: 0 0 0 2px #f57c00, 0 1px 3px rgba(0, 0, 0, 0.3);
    }
    .auto-fill-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      border: 1px solid #f57c00;
      font-size: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 2;
    }

    .dot-player-name {
      /* V25D90-FRONT-F2: bumped from 0.55rem to 0.7rem + max-width 50px
         so the full name fits on one line (or wraps to two for names
         like "Bellingham"). Killed the aggressive text-overflow:
         ellipsis that was truncating "Mbappé" → "Mb". The white-space
         rule is now normal (was nowrap) so long names break onto a
         second line instead of being cut. The 50px max-width matches
         the 56px dot minus 2×2px padding minus 2×2px border. */
      font-size: 0.7rem;
      font-weight: 700;
      line-height: 1.1;
      max-width: 50px;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      text-align: center;
      color: #1e3c72;
    }

    /* V25D90-FRONT-F1: the role label now lives INSIDE every slot
       (was: only empty slots). Same vocabulary as .dot-label so
       empty slots and filled slots read identically. Slightly dimmer
       than the player name (opacity 0.78) so the eye lands on the
       name first, then the role. */
    .dot-role {
      font-size: 0.55rem;
      font-weight: 700;
      line-height: 1;
      color: #1e3c72;
      opacity: 0.78;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .dot-label { user-select: none; }

    /* ========== V25D89.2: stats grid (full-width under pitch + bench) ========== */
    /* Layout: header row with team names + Subs chip, then 8 stat rows
       (label + home value + away value). 3-col grid keeps every row
       visually aligned so the manager can scan "Posesión", "Goles",
       "Tiros totales" etc. left-to-right per team. */
    .partido-stats {
      margin-top: 0.35rem;
      padding: 0.4rem 0.55rem 0.35rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    .partido-stats h3 {
      margin: 0 0 0.25rem 0;
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e3c72;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .stats-minute-tag {
      font-size: 0.7rem;
      font-weight: 600;
      color: #5a6473;
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
    }
    .stats-subs-chip {
      font-size: 0.7rem;
      font-weight: 600;
      color: #0d47a1;
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      margin-left: 0.3rem;
    }
    .stats-header-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 0.5rem;
      padding-bottom: 0.3rem;
      margin-bottom: 0.25rem;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.7rem;
      font-weight: 700;
      color: #5a6473;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .stats-header-row .team-label.home { text-align: left; padding-left: 0.15rem; }
    .stats-header-row .team-label.away { text-align: right; padding-right: 0.15rem; }
    .stats-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 0.5rem;
      padding: 0.12rem 0;
      font-size: 0.78rem;
      align-items: center;
    }
    .stat-label {
      text-align: center;
      color: #5a6473;
      font-weight: 500;
    }
    .stat-value {
      font-weight: 700;
      color: #1e3c72;
      font-size: 0.9rem;
    }
    .stat-value.home { text-align: left; padding-left: 0.15rem; }
    .stat-value.away { text-align: right; padding-right: 0.15rem; }
    .stats-empty {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem;
      font-size: 0.78rem;
      color: #5a6473;
      font-style: italic;
    }
    .stats-empty mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    /* ========== V25D89.2: recent events timeline (compact list) ========== */
    /* Layout: header + scrollable list of 6 events max. Each row is a
       4-col grid (icon, minute, player, description) so the manager can
       scan "who did what when" without parsing descriptions. */
    .recent-events {
      margin-top: 0.3rem;
      padding: 0.4rem 0.55rem;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }
    .recent-events h3 {
      margin: 0 0 0.25rem 0;
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e3c72;
    }
    .events-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      max-height: 120px;
      overflow-y: auto;
    }
    .event-item {
      display: grid;
      grid-template-columns: 24px 32px 1fr 2fr;
      gap: 0.4rem;
      padding: 0.18rem 0.4rem;
      font-size: 0.7rem;
      align-items: center;
      border-radius: 4px;
      background: #f5f7fa;
      border-left: 3px solid transparent;
    }
    .event-icon { font-size: 0.9rem; text-align: center; }
    .event-minute { font-weight: 700; color: #1e3c72; }
    .event-player {
      font-weight: 600;
      color: #1e3c72;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .event-desc {
      color: #5a6473;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .event-goal {
      background: #e8f5e9;
      border-left-color: #2e7d32;
    }
    .event-yellow_card {
      background: #fff8e1;
      border-left-color: #f57c00;
    }
    .event-red_card {
      background: #ffebee;
      border-left-color: #c62828;
    }
    .event-substitution {
      background: #e3f2fd;
      border-left-color: #1976d2;
    }
    .event-injury {
      background: #fce4ec;
      border-left-color: #ad1457;
    }
    .events-empty {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem;
      font-size: 0.75rem;
      color: #5a6473;
      font-style: italic;
    }
    .events-empty mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    /* ========== V25D89-FRONT-A: rival tab — read-only ========== */

    .rival-pitch-wrapper {
      padding: 0.2rem 0 0.3rem;
    }

    /* V25D89-FRONT-A: rival dots are visually de-emphasized (grayed
       out) and interaction-disabled (no pointer events, no cursor).
       No drag handlers are bound. */
    .rival-pitch .player-dot {
      cursor: default;
      opacity: 0.55;
      pointer-events: none;
    }
    .rival-pitch .player-dot:hover {
      transform: none;
    }

    /* V25D89-FRONT-A: the rival formation header is a non-interactive
       read-only display of the awayFormation string (no mat-select). */
    .rival-formation-readonly {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      background: #e3f2fd;
      color: #0d47a1;
      border: 1px solid #90caf9;
      border-radius: 999px;
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    /* ========== Manager-tab: bench + grid (F5 mirror) ========== */

    .formation-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.4rem;
      margin-bottom: 0.2rem;
    }
    @media (min-width: 601px) {
      .formation-grid {
        grid-template-columns: 2fr 1fr;
      }
    }
    .col-pitch h3,
    .col-bench h3 {
      margin: 0 0 0.25rem 0;
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e3c72;
    }

    .bench-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 280px;
      overflow-y: auto;
      padding: 0.3rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }

    .bench-player {
      display: flex;
      flex-direction: column;
      padding: 0.35rem 0.5rem;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      cursor: grab;
      transition: background 0.1s ease, transform 0.1s ease;
      user-select: none;
    }
    .bench-player:hover {
      background: #f5f7fa;
      transform: translateX(2px);
    }
    .bench-player:active { cursor: grabbing; }

    .bench-player-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: #1e3c72;
      line-height: 1.2;
    }

    .bench-player-pos {
      font-size: 0.65rem;
      font-weight: 500;
      color: #5a6473;
      margin-top: 0.15rem;
    }

    .bench-empty {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem;
      font-size: 0.78rem;
      color: #5a6473;
      font-style: italic;
    }

    .bench-empty mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    .hint {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      color: #5a6473;
      margin: 0;
      padding: 0.18rem 0.35rem;
      background: #f5f7fa;
      border-radius: 4px;
      line-height: 1.3;
    }
    .hint mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    /* ========== V25D89-FRONT-A: tab styling (mat-tab overrides) ========== */

    .partido-tabs ::ng-deep .mat-mdc-tab-header {
      background: #f5f7fa;
      border-radius: 6px 6px 0 0;
    }

    .submit-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.85);
      z-index: 10;
      font-size: 0.9rem;
      color: #1e3c72;
      border-radius: 6px;
    }

    .partido-modal-actions { padding: 0.15rem 1rem 0.2rem; }

    /* V25D89-FRONT-A: success toast styling (snackbar) — same as F5. */
    :host ::ng-deep .success-toast {
      --mdc-snackbar-container-color: #2e7d32;
      --mdc-snackbar-supporting-text-color: #ffffff;
      --mat-snack-bar-button-color: #c8e6c9;
      font-weight: 600;
    }

    /* ========== Responsive — V25D56 mirror ========== */

    @media (max-width: 600px) {
      .partido-modal-root {
        min-width: 0;
        max-width: 100vw;
        padding: 0 0.25rem;
      }
      /* V25D89.4-FRONT: also override the dialog container cap at
         mobile so the 95vw base rule doesn't fight the 100vw mobile
         rule (CSS cascade picks the later rule, which is this one). */
      :host ::ng-deep .mat-mdc-dialog-container {
        max-width: 100vw;
        width: 100vw;
      }
      .pitch {
        padding: 0.35rem 0.25rem;
        gap: 0.2rem;
        /* V25D90-FRONT-F2: mobile pitch keeps the smaller dot scale so
           11 dots still fit on a portrait phone (320-360px viewport).
           320px is enough for 11 × ~24px dots with ~5px gaps. */
        min-height: 300px;
      }
      .pitch::after {
        width: 48px;
        height: 48px;
      }
      .pitch-line {
        gap: 4px;
        min-height: 36px;
      }
      .player-dot {
        /* V25D90-FRONT-F2: mobile dot scale — still bigger than the
           legacy 18px so the role label below the name stays legible,
           but small enough that 11 dots fit on a 320px viewport with
           the standard pitch-line gap. */
        width: 28px;
        height: 28px;
        min-width: 22px;
        max-width: 32px;
        font-size: 0.6rem;
        padding: 1px 1px;
      }
      .dot-player-name {
        font-size: 0.55rem;
        line-height: 1.05;
        max-width: 26px;
      }
      .dot-role {
        font-size: 0.45rem;
      }
      .dot-label {
        font-size: 0.6rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
      .formation-select {
        max-width: 100%;
      }
      .formation-row { margin-bottom: 0.35rem; }
      .score-chip {
        font-size: 0.75rem;
        padding: 0.15rem 0.5rem;
        min-width: 2.2rem;
      }
    }

    @media (min-width: 601px) and (max-width: 1024px) {
      /* V25D89.4-FRONT: tablet — drop the 460px cap so the modal uses
         the full 95vw from the base rule. Keep a sensible min-width
         (320px) so the pitch doesn't get squashed on portrait tablets. */
      .partido-modal-root {
        min-width: 320px;
        max-width: 100%;
      }
      .pitch { padding: 0.4rem 0.3rem; gap: 0.3rem; min-height: 340px; }
      .pitch::after { width: 54px; height: 54px; }
      .pitch-line { gap: 8px; min-height: 48px; }
      .player-dot {
        /* V25D90-FRONT-F2: tablet scale — bigger than mobile, smaller
           than the 56px desktop base. Gives portrait tablets (~768px)
           enough room for 11 dots without the names overflowing the
           4-3-3 / 4-4-2 lines. */
        width: 40px;
        height: 40px;
        min-width: 32px;
        max-width: 46px;
        font-size: 0.7rem;
        padding: 2px 2px;
      }
      .dot-player-name {
        font-size: 0.62rem;
        line-height: 1.05;
        max-width: 36px;
      }
      .dot-role { font-size: 0.5rem; }
      .dot-label { font-size: 0.7rem; }
    }

    @media (min-width: 1600px) {
      /* V25D89.4-FRONT: xlarge viewport — keep the player-dot scale-up
         but DROP the 800px max-width cap so the 95vw base rule applies.
         On a 1920px+ monitor the modal now fills 95% of the width
         (~1824px) instead of being capped at 800px. */
      .partido-modal-root { max-width: 100%; }
      .player-dot {
        /* V25D90-FRONT-F2: xlarge scale — bigger than the 56px base
           so the dot feels proportional to the wider modal. The 4-4-2
           line has 4 dots, so on a 1824px modal each dot can claim
           ~440px of horizontal space; 64px leaves room for ~9 chars
           on a single line (e.g. "Vinícius"). */
        width: 64px;
        height: 64px;
        font-size: 0.78rem;
      }
      .dot-player-name {
        font-size: 0.75rem;
        max-width: 58px;
      }
      .dot-role { font-size: 0.6rem; }
    }

    /* ========== V25D90-FRONT-F4: z-index layering for the Formation
       mat-select dropdown so it stays visible above the partido
       modal backdrop. Material CDK renders each overlay in its own
       cdk-overlay-container div appended to the body, and the cdk
       assigns z-indices by pane-creation order (last pane wins by
       default, but the partido modal cdk-overlay-backdrop is a
       sibling that absorbs clicks). We bump the partido modal pane
       above the default Material z-index (1000) and push the
       mat-select panel one step further so the dropdown options
       render on top of the partido backdrop.

       The partido modal pane class is "partido-modal-pane" (added via
       MatDialogConfig.panelClass in live-match-modals.service.ts so
       both the substitution / formation / partido / rival-card modals
       can share the layer). The mat-select panel class is
       "formation-select-panel" (added via MatSelectConfig.panelClass
       or on the mat-select element). These two classes are the
       handles we override here.

       Why not just raise the whole cdk-overlay-container z-index?
       Because Material uses multiple sibling overlays and globally
       raising them would also re-stack the snackbar (which lives
       above 1050). Per-pane targeting keeps the change scoped. */
    :host ::ng-deep .cdk-overlay-pane.partido-modal-pane {
      z-index: 1050;
    }
    :host ::ng-deep .cdk-overlay-pane.formation-select-panel {
      z-index: 1060;
    }
    :host ::ng-deep .formation-select {
      z-index: 1100;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartidoModalComponent {

  readonly data: PartidoDialogData = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PartidoModalComponent>);
  private engineService = inject(MatchEngineService);
  private snackBar = inject(MatSnackBar);

  /** Available formations (12 codes from the shared constants). */
  readonly formations: readonly string[] = ALL_FORMATIONS;

  // ========== V25D89-FRONT-A: tab state ==========

  /** Currently visible tab. Default = 'mine' (manager formation first). */
  readonly activeTab = signal<'mine' | 'rival'>('mine');

  // ========== V25D89.2: stats live data (derived from MatchEvent list) ==========

  /**
   * V25D89.2: full MatchEvent list from the snapshot, defensively defaulted
   * to {@code []} when the SSE feed hasn't reached tick 1 (modal opens while
   * the round is still NOT_STARTED). All derived stats + the timeline read
   * from this signal.
   */
  private readonly eventList = (): MatchEvent[] => this.data.events ?? [];

  /**
   * V25D89.2: derived match stats from {@link eventList}. Returns a flat
   * row-per-stat shape so the template can {@code *ngFor} over a single
   * collection. Each row carries:
   * <ul>
   *   <li>{@code label} — display string in Spanish</li>
   *   <li>{@code home} / {@code away} — formatted value</li>
   * </ul>
   * Computed eagerly (not as a {@code computed} signal) because Angular's
   * signals don't deeply track {@code data.events} reference changes —
   * the SSE feed pushes a NEW MatchState object every tick, so the dialog
   * data is replaced wholesale on each round-live vm$ emission. Calling
   * this getter per change-detection cycle is cheap (8 filter passes over
   * a list that maxes at ~120 events per match) and keeps the data fresh.
   *
   * <p>Stats derived:
   * <ul>
   *   <li>Posesión — {@code state.homePossession}/{@code state.awayPossession}
   *       (NOT derived from events; possession is its own BE1 field).</li>
   *   <li>Goles — {@code state.score.home/away} (canonical, not GOAL events).</li>
   *   <li>Tiros totales — count(SHOT + SHOT_ON_TARGET) for each team.</li>
   *   <li>Tiros a puerta — count(SHOT_ON_TARGET) for each team.</li>
   *   <li>Corners — count(CORNER) for each team.</li>
   *   <li>Faltas — count(FOUL) for each team.</li>
   *   <li>Offsides — count(OFFSIDE) for each team.</li>
   *   <li>Tarjetas — count(YELLOW_CARD + RED_CARD) shown as "A:R" for each
   *       team (yellows:reds) so the manager can spot ejections at a glance.</li>
   * </ul>
   *
   * <p>Event attribution: each {@link MatchEvent} carries an optional
   * {@code teamId}. We match it against {@code data.homeTeamId} /
   * {@code data.awayTeamId} (both strings) and increment the corresponding
   * bucket. Events without a {@code teamId} (legacy V23 synthetic events)
   * are skipped — they don't carry enough info to attribute to a side.
   *
   * <p>Why string-comparison: {@code state.homeTeamId} and the event's
   * {@code teamId} may have different types (UUID vs string) depending on
   * the SSE serialization layer. {@link String(...)} normalizes both sides
   * and handles the undefined case safely.
   */
  statsRows(): PartidoStatRow[] {
    const events = this.eventList();
    const homeId = String(this.data.homeTeamId ?? '');
    const awayId = String(this.data.awayTeamId ?? '');

    let homeShots = 0, awayShots = 0;
    let homeShotsOnTarget = 0, awayShotsOnTarget = 0;
    let homeCorners = 0, awayCorners = 0;
    let homeFouls = 0, awayFouls = 0;
    let homeOffsides = 0, awayOffsides = 0;
    let homeYellow = 0, awayYellow = 0;
    let homeRed = 0, awayRed = 0;

    for (const ev of events) {
      if (!ev) { continue; }
      const teamId = String(ev.teamId ?? '');
      const isHome = teamId === homeId;
      const isAway = teamId === awayId;
      if (!isHome && !isAway) { continue; }
      const bucket = isHome
        ? { shots: () => homeShots++, sot: () => homeShotsOnTarget++,
            corner: () => homeCorners++, foul: () => homeFouls++,
            offside: () => homeOffsides++, yellow: () => homeYellow++, red: () => homeRed++ }
        : { shots: () => awayShots++, sot: () => awayShotsOnTarget++,
            corner: () => awayCorners++, foul: () => awayFouls++,
            offside: () => awayOffsides++, yellow: () => awayYellow++, red: () => awayRed++ };
      switch (ev.eventType) {
        case 'SHOT':
        case 'SHOT_ON_TARGET':
          bucket.shots();
          if (ev.eventType === 'SHOT_ON_TARGET') { bucket.sot(); }
          break;
        case 'CORNER':
          bucket.corner();
          break;
        case 'FOUL':
          bucket.foul();
          break;
        case 'OFFSIDE':
          bucket.offside();
          break;
        case 'YELLOW_CARD':
          bucket.yellow();
          break;
        case 'RED_CARD':
          bucket.red();
          break;
        default:
          // GOAL / INJURY / SUBSTITUTION / etc. not part of the stats grid
          // (goles comes from state.score; the rest is shown in the timeline).
          break;
      }
    }

    const score = this.data.score ?? { home: 0, away: 0 };
    const homePoss = this.data.homePossession ?? 50;
    const awayPoss = this.data.awayPossession ?? 50;

    return [
      { label: 'Posesión',           home: `${homePoss}%`,                   away: `${awayPoss}%` },
      { label: 'Goles',              home: String(score.home),               away: String(score.away) },
      { label: 'Tiros totales',      home: String(homeShots),                away: String(awayShots) },
      { label: 'Tiros a puerta',     home: String(homeShotsOnTarget),        away: String(awayShotsOnTarget) },
      { label: 'Corners',            home: String(homeCorners),              away: String(awayCorners) },
      { label: 'Faltas',             home: String(homeFouls),                away: String(awayFouls) },
      { label: 'Offsides',           home: String(homeOffsides),             away: String(awayOffsides) },
      { label: 'Tarjetas A:R',       home: `${homeYellow}:${homeRed}`,       away: `${awayYellow}:${awayRed}` }
    ];
  }

  /**
   * V25D89.2: last 6 events, most recent first. Drives the timeline section
   * below the stats. Capped at 6 so the section stays within ~140px (the
   * modal's available height after the pitch + bench + stats + footer).
   * No pagination — the timeline is a glance, not a full event log; the
   * match-card already has a fuller feed on the round-live page.
   */
  recentEvents(): MatchEvent[] {
    return this.eventList().slice(-6).reverse();
  }

  /**
   * V25D89.2: true when the modal has received at least one event. Drives
   * the "stats disponibles cuando arranque el partido" empty state.
   */
  hasEvents(): boolean {
    return this.eventList().length > 0;
  }

  /**
   * V25D89.2: current minute accessor used by the template header tag.
   * Falls back to 0 when the modal opens while the round hasn't ticked
   * yet (NOT_STARTED → minute 0).
   */
  currentMinute(): number {
    return this.data.currentMinute ?? 0;
  }

  /**
   * V25D90-FRONT-F3: home score accessor for the score chip in the modal
   * title bar AND the stats-header-row "score-cell" (replaces the V25D89.2
   * dash placeholder). Sourced from {@code data.score.home}, falling back
   * to 0 when the SSE feed hasn't reached tick 1.
   */
  homeScore(): number {
    return this.data.score?.home ?? 0;
  }

  /**
   * V25D90-FRONT-F3: away score accessor (sister of {@link homeScore}).
   * Same fall-back semantics.
   */
  awayScore(): number {
    return this.data.score?.away ?? 0;
  }

  /**
   * V25D89.2: subs remaining for the manager team. {@code 5 - 0} is the
   * full quota; the chip "Subs: 3/5" lets the manager see at a glance
   * how many changes they have left. Source of truth is the backend
   * (V25D79 D5 = {@code max(0, 5 - count(SUBSTITUTION events))}).
   */
  substitutionsRemaining(): number {
    return this.data.substitutionsRemaining ?? 5;
  }

  /**
   * V25D89.2: human-readable event icon for the timeline. Matches the
   * F3 timeline icons used on the round-live page (round-live.component.ts
   * {@code getEventIcon}) so the visual vocabulary stays consistent.
   */
  getEventIcon(eventType: string): string {
    const iconMap: Record<string, string> = {
      'GOAL':          '⚽',
      'SHOT':          '🎯',
      'SHOT_ON_TARGET':'🎯',
      'MISS':          '↗️',
      'BLOCK':         '🛡️',
      'SAVE':          '🧤',
      'CHANCE_CREATED':'✨',
      'FOUL':          '⚠️',
      'YELLOW_CARD':   '🟨',
      'RED_CARD':      '🟥',
      'INJURY':        '🚑',
      'CORNER':        '🚩',
      'OFFSIDE':       '🚩',
      'SUBSTITUTION':  '🔄',
      'CARD':          '🟨',
      'TACTICAL_CHANGE':'📋'
    };
    return iconMap[eventType] || '📋';
  }

  // ========== V25D89-FRONT-A: manager-tab formation state (F5 mirror) ==========

  /** Currently selected formation (signal-based for OnPush). */
  readonly selectedFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.currentFormation)
  );

  /**
   * Mutable slot→playerId map. Initialized from {@code data.currentSlots}
   * and updated by drag-and-drop handlers + formation-change re-flow. The
   * visual pitch template binds to this map to render the player name
   * in each dot.
   */
  slotAssignments: Map<number, string | null> = new Map();

  /** id of the slot currently being dragged (or null when idle). */
  dragSourceSlotIdx: number | null = null;
  dragSourceIsBench = false;

  /** Slots that were filled by the auto-fill pass — render a lock icon. */
  readonly autoFilledSlots = new Map<number, string>();

  /** Warning surfaced when at least one slot could not be auto-filled. */
  warningMsg = '';

  isSubmitting = false;
  errorMsg = '';
  private destroy$ = new Subject<void>();

  /**
   * Position group mapping for the bench fill — mirrors the F5 modal's
   * POSITION_GROUPS so the auto-fill behavior is consistent across both
   * modal entry points.
   */
  private static readonly POSITION_GROUPS: Record<string, string[]> = {
    GK:  ['GK'],
    DEF: ['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
    MID: ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
    ATT: ['ATT', 'ST', 'CF', 'LW', 'RW']
  };

  /**
   * V25D89-FRONT-A: footer signal — true when the manager has unsaved
   * changes (formation string OR slot assignments differ from initial).
   * Drives the "Guardar" button enable/disable. Recomputed reactively
   * whenever selectedFormation changes or slotAssignments mutates (via
   * the no-op {@code selectedFormation.set} bump trick from F5).
   */
  readonly hasPendingChanges = computed(() => {
    const formationChanged = this.selectedFormation() !== this.data.currentFormation;
    const slotsChanged = this.slotsDifferFromInitial();
    return formationChanged || slotsChanged;
  });

  // ========== V25D89-FRONT-A: rival-tab formation ==========

  /**
   * Rival formation (read-only). Sourced from
   * {@code data.rivalFormation} (which is {@code state.awayFormation}).
   * Normalized via {@link normalizeFormation} so the rival tab falls
   * back to 4-4-2 if the SSE feed carries a stale or unknown string.
   */
  readonly rivalFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.rivalFormation)
  );

  constructor() {
    // V25D89-FRONT-A: initialize slotAssignments from the dialog data.
    for (const s of this.data.currentSlots ?? []) {
      this.slotAssignments.set(s.slotIndex, s.sessionPlayerId || null);
    }
  }

  private normalizeFormation(input: string): FormationCode {
    const normalized = (input || '').replace(/\s/g, '');
    if ((ALL_FORMATIONS as readonly string[]).includes(normalized)) {
      return normalized as FormationCode;
    }
    return '4-4-2';
  }

  // ========== V25D89-FRONT-A: manager-tab event handlers (F5 mirror) ==========

  onFormationChange(value: string): void {
    const newFormation = this.normalizeFormation(value);
    this.selectedFormation.set(newFormation);
    const oldAssignments = new Map(this.slotAssignments);
    const newLineCount = (FORMATION_LINES_BY_FORMATION[newFormation] ?? []).reduce(
      (sum, line) => sum + line.length, 0
    );
    this.slotAssignments = new Map();
    for (let i = 0; i < newLineCount; i++) {
      this.slotAssignments.set(i, oldAssignments.get(i) ?? null);
    }
    this.errorMsg = '';
  }

  /** Tab change handler — drives the "Mi Formación" / "Formación Rival" UI. */
  onTabChange(idx: number): void {
    this.activeTab.set(idx === 0 ? 'mine' : 'rival');
  }

  // ========== Drag-and-drop handlers (HTML5, F5 mirror) ==========

  onSlotDragStart(event: DragEvent, slotIdx: number): void {
    if (!event.dataTransfer) {
      return;
    }
    this.dragSourceSlotIdx = slotIdx;
    this.dragSourceIsBench = false;
    event.dataTransfer.setData('text/plain', `slot:${slotIdx}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  onBenchDragStart(event: DragEvent, playerId: string): void {
    if (!event.dataTransfer) {
      return;
    }
    this.dragSourceSlotIdx = -1;
    this.dragSourceIsBench = true;
    event.dataTransfer.setData('text/plain', `bench:${playerId}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  onSlotDragOver(event: DragEvent): void {
    if (!event.dataTransfer) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  onSlotDrop(event: DragEvent, targetSlotIdx: number): void {
    event.preventDefault();
    if (this.dragSourceSlotIdx === null) {
      return;
    }
    if (this.dragSourceIsBench) {
      const raw = event.dataTransfer?.getData('text/plain') ?? '';
      const playerId = raw.startsWith('bench:') ? raw.substring(6) : null;
      if (!playerId) {
        return;
      }
      this.slotAssignments.set(targetSlotIdx, playerId);
      this.clearAutoFillMarker(targetSlotIdx);
    } else {
      const sourceSlot = this.dragSourceSlotIdx;
      if (sourceSlot === targetSlotIdx) {
        return;
      }
      const sourcePlayer = this.slotAssignments.get(sourceSlot) ?? null;
      const targetPlayer = this.slotAssignments.get(targetSlotIdx) ?? null;
      this.slotAssignments.set(targetSlotIdx, sourcePlayer);
      this.slotAssignments.set(sourceSlot, targetPlayer);
      this.clearAutoFillMarker(targetSlotIdx);
      this.clearAutoFillMarker(sourceSlot);
    }
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
    // Force CD by bumping the formation signal (signals don't track Map
    // mutations, so we need a tick to re-render the dots + the
    // hasPendingChanges computed).
    this.selectedFormation.set(this.selectedFormation());
  }

  onSlotDragEnd(): void {
    this.dragSourceSlotIdx = null;
    this.dragSourceIsBench = false;
  }

  // ========== Auto-fill empty slots (F5 mirror) ==========

  autoFillEmptySlots(): void {
    this.autoFilledSlots.clear();
    this.warningMsg = '';
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let slotIdx = 0;
    let unfilled = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        const current = this.slotAssignments.get(slotIdx);
        if (current) {
          slotIdx++;
          continue;
        }
        const roleLabel = line[dotIdx];
        const filled = this.tryFillSlot(slotIdx, roleLabel);
        if (!filled) {
          unfilled++;
        }
        slotIdx++;
      }
    }
    if (unfilled > 0) {
      this.warningMsg = `${unfilled} posición(es) no se pudieron completar — no hay suficientes jugadores en el banquillo con posición compatible.`;
    }
    this.selectedFormation.set(this.selectedFormation());
  }

  private tryFillSlot(slotIdx: number, roleLabel: string): boolean {
    const compatibleGroups = this.compatibleGroupForRole(roleLabel);
    const bench = this.benchPlayers;
    const pick = bench.find(p => compatibleGroups.includes((p.position || '').toUpperCase()));
    if (!pick) {
      return false;
    }
    this.slotAssignments.set(slotIdx, pick.sessionPlayerId);
    this.autoFilledSlots.set(slotIdx, pick.sessionPlayerId);
    return true;
  }

  private compatibleGroupForRole(roleLabel: string): string[] {
    const upper = (roleLabel || '').toUpperCase();
    for (const group of Object.keys(PartidoModalComponent.POSITION_GROUPS)) {
      if (PartidoModalComponent.POSITION_GROUPS[group].includes(upper)) {
        return PartidoModalComponent.POSITION_GROUPS[group];
      }
    }
    const groups = PartidoModalComponent.POSITION_GROUPS;
    return [
      ...groups['GK'],
      ...groups['DEF'],
      ...groups['MID'],
      ...groups['ATT']
    ];
  }

  isAutoFilledSlot(slotIdx: number): boolean {
    return this.autoFilledSlots.has(slotIdx);
  }

  private clearAutoFillMarker(slotIdx: number): void {
    if (this.autoFilledSlots.has(slotIdx)) {
      this.autoFilledSlots.delete(slotIdx);
    }
  }

  // ========== V25D89-FRONT-A: pitch helpers (F5 mirror) ==========

  playerAtSlot(slotIdx: number): SessionPlayer | null {
    const pid = this.slotAssignments.get(slotIdx);
    if (!pid) {
      return null;
    }
    return (this.data.squad ?? []).find(p => p.sessionPlayerId === pid) ?? null;
  }

  getSlotIndex(lineIdx: number, dotIdx: number): number {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let idx = 0;
    for (let i = 0; i < lineIdx; i++) {
      idx += (lines[i]?.length ?? 0);
    }
    return idx + dotIdx;
  }

  get benchPlayers(): SessionPlayer[] {
    const assigned = new Set<string>();
    for (const pid of this.slotAssignments.values()) {
      if (pid) { assigned.add(pid); }
    }
    return (this.data.squad ?? []).filter(p => !assigned.has(p.sessionPlayerId));
  }

  get formationLines(): number[] {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()];
    if (!lines || lines.length === 0) {
      return [1, 4, 4, 2];
    }
    return lines.map(line => line.length);
  }

  getDotLabel(lineIdx: number, n: number, _count: number, _isLast: boolean): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()];
    if (!lines || !lines[lineIdx]) {
      return '';
    }
    return lines[lineIdx][n] ?? '';
  }

  // ========== V25D89-FRONT-A: rival-tab helpers ==========

  /**
   * Pitch lines for the rival formation. Mirrors the manager tab's
   * {@link formationLines} but uses {@link rivalFormation} (read-only).
   */
  get rivalFormationLines(): number[] {
    const lines = FORMATION_LINES_BY_FORMATION[this.rivalFormation()];
    if (!lines || lines.length === 0) {
      return [1, 4, 4, 2];
    }
    return lines.map(line => line.length);
  }

  /** Role label for a rival dot — no player name (rival XI not exposed). */
  getRivalDotLabel(lineIdx: number, dotIdx: number): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.rivalFormation()];
    if (!lines || !lines[lineIdx]) {
      return '';
    }
    return lines[lineIdx][dotIdx] ?? '';
  }

  // ========== V25D89-FRONT-A: diff + save ==========

  private slotsDifferFromInitial(): boolean {
    const initial = new Map<number, string>();
    for (const s of this.data.currentSlots ?? []) {
      initial.set(s.slotIndex, s.sessionPlayerId || '');
    }
    if (this.slotAssignments.size !== initial.size) {
      return true;
    }
    for (const [idx, pid] of this.slotAssignments) {
      const initialPid = initial.get(idx) ?? '';
      if ((pid ?? '') !== initialPid) {
        return true;
      }
    }
    return false;
  }

  private buildSlotListForBackend(): Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
  }> {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    const slots: Array<{ sessionPlayerId: string; position: string; slotIndex: number }> = [];
    let slotIdx = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        slots.push({
          sessionPlayerId: this.slotAssignments.get(slotIdx) ?? '',
          position: line[dotIdx],
          slotIndex: slotIdx
        });
        slotIdx++;
      }
    }
    return slots;
  }

  // ========== V25D89-FRONT-A: footer actions ==========

  /**
   * V25D89-FRONT-A: footer "Guardar" handler. Mirrors F5's
   * {@code FormationModalComponent.confirm} but exposed as
   * {@link save} to match the task spec's label ("Guardar" instead of
   * "Confirmar"). POSTs the formation change via
   * {@code MatchEngineService.changeFormation} and closes the dialog
   * on success.
   */
  save(): void {
    if (this.isSubmitting) {
      return;
    }
    if (!this.hasPendingChanges()) {
      // No changes — close immediately without API call.
      this.dialogRef.close({ success: false, reason: 'no-change' });
      return;
    }
    this.autoFillEmptySlots();
    this.isSubmitting = true;
    this.errorMsg = '';
    const slots = this.buildSlotListForBackend();
    this.engineService.changeFormation(this.data.matchId, slots)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSubmitting = false;
          if (result.success) {
            this.snackBar.open(
              `Formación cambiada a ${this.selectedFormation()}`,
              'OK',
              { duration: 3000, panelClass: 'success-toast' }
            );
            this.dialogRef.close({
              success: true,
              result,
              formation: this.selectedFormation()
            });
          } else {
            this.errorMsg = result.error || 'Cambio de formación rechazado por el servidor';
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMsg = 'Error de red al intentar cambiar la formación';
          console.error('[PARTIDO-MODAL] error', err);
        }
      });
  }

  /**
   * V25D89-FRONT-A: footer "Descartar" handler. Closes the dialog
   * without saving — the dialog opens again with the original
   * formation (SSE-driven vm$ is untouched).
   */
  discard(): void {
    this.dialogRef.close({ success: false, reason: 'discarded' });
  }

  /** @deprecated alias kept for symmetry with F5 modal — calls discard. */
  cancel(): void {
    this.discard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}