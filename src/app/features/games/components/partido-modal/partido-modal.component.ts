import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, isDevMode, signal } from '@angular/core';
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
import { from, of, Subject, takeUntil } from 'rxjs';
import { concatMap, finalize, switchMap, timeout, toArray } from 'rxjs/operators';
import { MatchEngineService } from '../../../../core/services/match-engine.service';
import { ALL_FORMATIONS, FormationCode } from '../../../../shared/constants/formations';
import { SessionPlayer } from '../../../../shared/models/player.model';
import { MatchEvent } from '../../../../core/services/match-engine.model';

/**
 * Single row in the stats grid. Each row maps one match-event counter to
 * its home/away value. The flat shape keeps the template simple and makes
 * every stat render with the same layout.
 */
export interface PartidoStatRow {
  label: string;
  home: string;
  away: string;
}

interface PendingPartidoSubstitution {
  playerOffId: string;
  playerOnId: string;
  slotIndex: number;
}

export interface PartidoDialogData {
  matchId: string;
  /** Current formation string (e.g. "4-4-2") for the manager team. */
  currentFormation: string;
  homeTeamId: string;
  /** Rival team id used to split match events into home/away stats. */
  awayTeamId?: string;
  /** Manager-side current slots (sessionPlayerId + position + slotIndex). */
  currentSlots: Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }>;
  /** Manager squad (starters + bench combined). */
  squad: SessionPlayer[];
  /** sessionPlayerIds currently in the starting XI (subset of squad). */
  startingIds: Set<string>;
  /**
   * Optional live-injury focus. When a forced injury opens Partido, the
   * injured starter is highlighted so the manager can pick a replacement,
   * change formation and fine-tune pixels in one professional flow.
   */
  preSelectedPlayerId?: string;
  reason?: 'INJURY_FORCED_SUBSTITUTION' | string;
  /** Read-only rival formation shown in the rival tab. */
  rivalFormation: string;
  /** Live minute shown in the modal header and stats section. */
  currentMinute?: number;
  /** Current score from the live match snapshot. */
  score?: { home: number; away: number };
  /** Live possession percentages from the match snapshot. */
  homePossession?: number;
  awayPossession?: number;
  /** Human-readable team names; ids are used as fallback. */
  homeTeamName?: string;
  awayTeamName?: string;
  /** Full live event timeline used for stats and recent events. */
  events?: MatchEvent[];
  /** Remaining substitutions for the manager team. */
  substitutionsRemaining?: number;
}

/** Role labels rendered by each formation line in the live pitch. */
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
  '4-1-2-3':     [['GK'], ['LB', 'CB', 'CB', 'RB'], ['CDM'], ['CM', 'CM'], ['LW', 'ST', 'RW']]
};

/** Live match dialog for formation edits, substitutions, rival view and stats. */
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
  // Inline styles are required by the current test setup.
  styles: [`
    /* : full-width modal. The cap (540px) made
       the modal look like it floated in a corner of the viewport on
       desktop  -  early visual tests showed too much empty white space to the right of
       a 540px modal on a 1920px screen. New target: use 95% of the
       viewport width so the pitch + bench + stats + events layout
       has room to breathe. We keep the compact spacing for
       internal padding/margins  -  only the outer container expands. */
    .partido-modal-root {
      min-width: 0;
      max-width: 100%;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    /* : override Angular Material MDC dialog container
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

    /* : override Angular Material MDC dialog default
       padding so the title bar and content hug the modal edges.
       Without these overrides Material adds ~24px padding around the
       title and the content body  -  that's the bulk of the "espacio
       blanco lateral / superior" seen in the screenshot.
       : also cap max-height + enable vertical scroll so the
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
      max-height: calc(92vh - 116px);
      overflow-y: auto;
    }
    .partido-modal-title,
    :host ::ng-deep .mat-mdc-dialog-container h2.mat-mdc-dialog-title {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.75rem 1rem;
      margin: 0;
      background:
        radial-gradient(circle at 8% 0%, rgba(74, 222, 128, 0.22), transparent 34%),
        linear-gradient(135deg, #061b10 0%, #0f2f1d 48%, #102a43 100%);
      color: #f8fafc;
      border-bottom: 1px solid rgba(187, 247, 208, 0.22);
      box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.08);
    }
    :host ::ng-deep .mat-mdc-dialog-container .mat-mdc-tab-body-content {
      padding: 0.35rem 0.6rem 0.5rem;
      overflow: hidden;
    }
    :host ::ng-deep .mat-mdc-dialog-container .mdc-dialog__content {
      padding: 0;
    }

    .title-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      margin-right: 0.1rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
    }

    .minute-tag {
      display: inline-block;
      margin-left: 0.15rem;
      padding: 0.18rem 0.6rem;
      background: rgba(226, 232, 240, 0.15);
      color: #dbeafe;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 800;
      vertical-align: middle;
      border: 1px solid rgba(219, 234, 254, 0.18);
    }

    /* : score chip in the modal title bar  -  sits between
       the icon and the minute tag. Same pill visual vocabulary as the
       minute tag so the title looks like a single coherent chip row.
       Background uses the score-themed green (not the neutral grey of
       the minute tag) so the eye lands on it first  -  it's the most
       information-dense element of the modal. */
    .score-chip {
      display: inline-block;
      margin-left: auto;
      padding: 0.24rem 0.8rem;
      background: linear-gradient(135deg, #16a34a 0%, #15803d 52%, #166534 100%);
      color: #fff;
      border-radius: 999px;
      font-size: 0.92rem;
      font-weight: 900;
      vertical-align: middle;
      letter-spacing: 0.04em;
      min-width: 2.6rem;
      text-align: center;
      box-shadow: 0 8px 20px rgba(22, 163, 74, 0.22);
    }

    .partido-modal-content { padding-top: 0; padding-bottom: 0; }

    :host ::ng-deep .mat-mdc-dialog-surface {
      border-radius: 18px;
      overflow: hidden;
      background: linear-gradient(180deg, #f8fafc 0%, #eef6ef 100%);
      box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
    }

    .coach-brief {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      margin: 0.55rem 0.6rem 0.4rem;
      padding: 0.65rem 0.8rem;
      border-radius: 16px;
      color: #ecfdf5;
      background:
        radial-gradient(circle at 0% 0%, rgba(34, 197, 94, 0.28), transparent 34%),
        linear-gradient(135deg, #052e16 0%, #14532d 58%, #0f172a 100%);
      border: 1px solid rgba(187, 247, 208, 0.18);
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
    }
    .coach-brief strong {
      display: block;
      font-size: 0.95rem;
      letter-spacing: 0.01em;
    }
    .coach-brief span {
      display: block;
      color: #bbf7d0;
      font-size: 0.78rem;
      margin-top: 0.12rem;
    }
    .coach-brief-chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.35rem;
      flex-shrink: 0;
    }
    .coach-brief-chips span {
      margin: 0;
      padding: 0.22rem 0.55rem;
      border-radius: 999px;
      color: #f8fafc;
      background: rgba(255, 255, 255, 0.13);
      border: 1px solid rgba(255, 255, 255, 0.16);
      font-weight: 800;
    }

    /* Status banners. */
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
    /* Rival-tab information banner. */
    .banner-info-ai {
      background: #e3f2fd;
      color: #0d47a1;
      border: 1px solid #bbdefb;
    }

    /* ========== Visual pitch (shared between manager + rival tabs) ========== */

    .formation-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin: 0.55rem 0.6rem 0.65rem;
      padding: 0.55rem 0.7rem;
      border: 1px solid rgba(20, 83, 45, 0.12);
      border-radius: 14px;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(236, 253, 245, 0.92));
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }

    .formation-select {
      width: 100%;
      max-width: 220px;
    }

    /* Editable/read-only pitch surface. */
    .pitch {
      position: relative;
      background:
        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.12), transparent 14%),
        repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 8%, rgba(0,0,0,0.04) 8% 16%),
        linear-gradient(180deg, #2f8b46 0%, #166534 55%, #0f4d2a 100%);
      border-radius: 14px;
      padding: clamp(0.45rem, 1vw, 0.9rem) clamp(0.35rem, 0.9vw, 0.75rem);
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      border: 2px solid rgba(255, 255, 255, 0.92);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.25),
        inset 0 28px 70px rgba(255, 255, 255, 0.06),
        inset 0 -28px 80px rgba(0, 0, 0, 0.14),
        0 22px 42px rgba(15, 23, 42, 0.22);
      min-height: clamp(300px, 36vh, 460px);
      justify-content: space-around;
      margin-bottom: 0.25rem;
      overflow: hidden;
      touch-action: none;
    }
    /* Halfway line. */
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
    /* Center circle. */
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
    .pitch-zone-label {
      position: absolute;
      right: 0.8rem;
      z-index: 1;
      color: rgba(236, 253, 245, 0.76);
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
      pointer-events: none;
    }
    .pitch-zone-attack { top: 0.8rem; }
    .pitch-zone-mid { top: 48%; }
    .pitch-zone-defense { bottom: 0.8rem; }
    /* Lift pitch lines above the pseudo-element lines so dots are visible. */
    .pitch > .pitch-line {
      position: relative;
      z-index: 1;
    }

    .pitch-line {
      display: flex;
      justify-content: space-around;
      align-items: center;
      min-height: 64px;
    }

    .manager-pitch {
      /* El XI propio se lee como el editor principal: arco propio abajo,
         ataque arriba. No cambia slotIndex ni motor; sólo la presentación. */
      flex-direction: column-reverse;
      padding-bottom: clamp(1rem, 2vh, 1.4rem);
    }

    .player-dot {
      /* : 30px  ->  56px so the full player name (e.g.
         "Bellingham", "Vinicius", "Mbappe") fits without aggressive
         ellipsis. The 56px width lets ~7 chars fit on one line at
         0.65rem; longer names wrap to 2 lines (white-space: normal
         on .dot-player-name below). Height matches width for a true
         circle, but the column-flex layout (name + role) means the
         inner content drives the actual visual height. */
      width: clamp(58px, 4.8vw, 78px);
      height: clamp(48px, 4.1vw, 64px);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.94);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      padding: 3px 2px;
      border: 2px solid rgba(15, 23, 42, 0.82);
      font-size: 0.7rem;
      font-weight: 700;
      color: #1e3c72;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.7);
      cursor: grab;
      user-select: none;
      touch-action: none;
      transition: transform 0.1s ease, box-shadow 0.1s ease, filter 0.1s ease;
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

    /* Auto-fill lock badge. */
    .player-dot.is-auto-filled {
      box-shadow: 0 0 0 2px #f57c00, 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .player-dot.is-locked-gk {
      cursor: not-allowed;
      box-shadow: 0 0 0 2px #f59e0b, 0 2px 6px rgba(0, 0, 0, 0.35);
    }

    /* : when the DT drops a marker freely on the pitch,
       render it by real pitch percentages instead of nudging the slot.
       This matches the pre-match editor's mental model and keeps the
       visible marker aligned with the customX/customY sent to the engine. */
    .player-dot.is-free-positioned {
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 3;
      box-shadow: 0 0 0 2px #38bdf8, 0 2px 6px rgba(0, 0, 0, 0.35);
    }

    .player-dot.is-pointer-dragging {
      z-index: 7;
      transform: scale(1.06);
      filter: saturate(1.1);
      box-shadow: 0 0 0 3px #fef08a, 0 18px 32px rgba(0, 0, 0, 0.42);
    }

    .player-dot.is-free-positioned.is-pointer-dragging {
      transform: translate(-50%, -50%) scale(1.06);
    }

    .player-dot.is-selected-nudge {
      outline: 3px solid #22c55e;
      outline-offset: 3px;
      box-shadow: 0 0 0 2px #bbf7d0, 0 4px 10px rgba(0, 0, 0, 0.35);
    }

    .nudge-panel {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.35rem 0.55rem;
      border: 1px solid rgba(20, 83, 45, 0.16);
      border-radius: 14px;
      background: #ffffff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
    }

    .nudge-copy {
      min-width: 170px;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .nudge-title {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      font-weight: 800;
    }

    .nudge-copy strong {
      color: #0f172a;
      font-size: 0.86rem;
    }

    .nudge-copy small {
      color: #475569;
      font-size: 0.72rem;
    }

    .nudge-pad {
      display: grid;
      grid-template-columns: 1fr;
      justify-items: center;
      gap: 0;
    }

    .nudge-pad button.mat-mdc-icon-button {
      width: 30px;
      height: 28px;
      padding: 0;
    }

    .nudge-pad button.mat-mdc-outlined-button {
      min-width: 64px;
      height: 30px;
      padding: 0 0.55rem;
    }

    .nudge-middle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .nudge-arrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.25rem;
      font-size: 1rem;
      font-weight: 800;
      line-height: 1;
    }

    .auto-fill-badge {
      position: absolute;
      top: -6px;
      right: -6px;
      min-width: 24px;
      height: 14px;
      padding: 0 4px;
      border-radius: 999px;
      background: #fff7ed;
      border: 1px solid #f57c00;
      color: #9a3412;
      font-size: 7px;
      letter-spacing: 0.03em;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 2;
    }

    .dot-player-name {
      /* : bumped from 0.55rem to 0.7rem + max-width 50px
         so the full name fits on one line (or wraps to two for names
         like "Bellingham"). Killed the aggressive text-overflow:
         ellipsis that was truncating "Mbappe"  ->  "Mb". The white-space
         rule is now normal (was nowrap) so long names break onto a
         second line instead of being cut. The 50px max-width matches
         the 56px dot minus 2x2px padding minus 2x2px border. */
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

    /* : the role label now lives INSIDE every slot
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

    /* ========== : stats grid (full-width under pitch + bench) ========== */
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
    .pending-substitutions {
      margin-top: 0.35rem;
      padding: 0.45rem 0.55rem;
      background: #ecfdf5;
      border: 1px solid #86efac;
      border-radius: 6px;
    }
    .pending-substitutions h3 {
      margin: 0 0 0.35rem 0;
      font-size: 0.82rem;
      font-weight: 700;
      color: #14532d;
    }
    .pending-sub-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr auto auto;
      gap: 0.45rem;
      align-items: center;
      font-size: 0.78rem;
      color: #0f172a;
    }
    .pending-sub-arrow {
      color: #16a34a;
      font-weight: 800;
    }
    .pending-sub-slot {
      color: #047857;
      font-size: 0.72rem;
    }
    .pending-sub-remove {
      min-width: 0;
      padding: 0 0.45rem;
      line-height: 1.65rem;
      font-size: 0.72rem;
      border-color: #86efac;
      color: #14532d;
      background: rgba(255, 255, 255, 0.55);
    }
    .bench-player.is-selected {
      border-color: #22c55e;
      background: #dcfce7;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
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

    /* ========== : recent events timeline (compact list) ========== */
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
    .event-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.25rem;
      padding: 0.1rem 0.25rem;
      border-radius: 999px;
      background: #e5e7eb;
      color: #111827;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-align: center;
    }
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

    /* ========== : rival tab  -  read-only ========== */

    .rival-pitch-wrapper {
      padding: 0.2rem 0 0.3rem;
    }

    /* : rival dots are visually de-emphasized (grayed
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

    /* : the rival formation header is a non-interactive
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

    /* ========== Manager tab: bench + pitch grid ========== */

    .formation-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.6rem;
      padding: 0 0.6rem;
      margin-bottom: 0.2rem;
    }
    @media (min-width: 601px) {
      .formation-grid {
        grid-template-columns: minmax(0, 3fr) minmax(260px, 0.85fr);
      }
    }
    .col-pitch,
    .col-bench {
      min-width: 0;
      padding: 0.55rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    }
    .col-pitch h3,
    .col-bench h3 {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      margin: 0 0 0.35rem 0;
      font-size: 0.88rem;
      font-weight: 700;
      color: #1e3c72;
    }
    .col-pitch h3 small,
    .col-bench h3 small {
      color: #64748b;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .bench-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: clamp(240px, 45vh, 520px);
      overflow-y: auto;
      padding: 0.3rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
    }

    .bench-player {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 0.55rem;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 10px;
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
      margin-top: 0;
      padding: 0.12rem 0.35rem;
      border-radius: 999px;
      background: #eef2ff;
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
      border-radius: 10px;
      line-height: 1.3;
    }
    .hint mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }

    /* ========== : tab styling (mat-tab overrides) ========== */

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

    .partido-modal-actions {
      padding: 0.55rem 1rem 0.65rem;
      background: #f8fafc;
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      position: relative;
      z-index: 2;
    }

    /* Success toast styling. */
    :host ::ng-deep .success-toast {
      --mdc-snackbar-container-color: #2e7d32;
      --mdc-snackbar-supporting-text-color: #ffffff;
      --mat-snack-bar-button-color: #c8e6c9;
      font-weight: 600;
    }

    /* ========== Responsive  -  mirror ========== */

    @media (max-width: 600px) {
      .partido-modal-root {
        min-width: 0;
        max-width: 100vw;
        padding: 0 0.25rem;
      }
      /* : also override the dialog container cap at
         mobile so the 95vw base rule doesn't fight the 100vw mobile
         rule (CSS cascade picks the later rule, which is this one). */
      :host ::ng-deep .mat-mdc-dialog-container {
        max-width: 100vw;
        width: 100vw;
      }
      .partido-modal-title,
      :host ::ng-deep .mat-mdc-dialog-container h2.mat-mdc-dialog-title {
        gap: 0.35rem;
        padding: 0.55rem 0.65rem;
      }
      .minute-tag {
        font-size: 0.68rem;
        padding: 0.12rem 0.42rem;
      }
      :host ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-content {
        max-height: calc(100vh - 108px);
      }
      .pitch {
        padding: 0.35rem 0.25rem;
        gap: 0.2rem;
        /* : mobile pitch keeps the smaller dot scale so
           11 dots still fit on a portrait phone (320-360px viewport).
           320px is enough for 11 x ~24px dots with ~5px gaps. */
        min-height: min(48vh, 340px);
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
        /* : mobile dot scale  -  still bigger than the
           legacy 18px so the role label below the name stays legible,
           but small enough that 11 dots fit on a 320px viewport with
           the standard pitch-line gap. */
        width: 42px;
        height: 36px;
        min-width: 22px;
        max-width: 38px;
        border-radius: 9px;
        font-size: 0.58rem;
        padding: 1px 1px;
      }
      .dot-player-name {
        font-size: 0.55rem;
        line-height: 1.05;
        max-width: 40px;
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
      .formation-row {
        margin: 0.4rem 0.35rem 0.45rem;
        align-items: stretch;
      }
      .coach-brief {
        margin: 0.45rem 0.35rem 0.35rem;
        align-items: flex-start;
        flex-direction: column;
      }
      .coach-brief-chips {
        justify-content: flex-start;
      }
      .pitch-zone-label {
        right: 0.45rem;
        font-size: 0.56rem;
      }
      .formation-grid { padding: 0 0.35rem; }
      .col-pitch,
      .col-bench { padding: 0.4rem; }
      .nudge-panel {
        width: 100%;
        justify-content: space-between;
      }
      .nudge-copy {
        min-width: 0;
      }
      .bench-list {
        max-height: 180px;
      }
      .partido-modal-actions {
        padding: 0.45rem 0.65rem 0.5rem;
      }
      .score-chip {
        font-size: 0.75rem;
        padding: 0.15rem 0.5rem;
        min-width: 2.2rem;
      }
    }

    @media (min-width: 601px) and (max-width: 1024px) {
      /* : tablet  -  drop the 460px cap so the modal uses
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
        /* : tablet scale  -  bigger than mobile, smaller
           than the 56px desktop base. Gives portrait tablets (~768px)
           enough room for 11 dots without the names overflowing the
           4-3-3 / 4-4-2 lines. */
        width: 54px;
        height: 46px;
        min-width: 32px;
        max-width: 46px;
        font-size: 0.7rem;
        padding: 2px 2px;
      }
      .dot-player-name {
        font-size: 0.62rem;
        line-height: 1.05;
        max-width: 48px;
      }
      .dot-role { font-size: 0.5rem; }
      .dot-label { font-size: 0.7rem; }
    }

    @media (max-height: 760px) and (min-width: 601px) {
      :host ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-content {
        max-height: calc(100vh - 118px);
      }
      .formation-row {
        margin: 0.35rem 0.5rem 0.4rem;
        padding: 0.35rem 0.55rem;
      }
      .pitch {
        min-height: 205px;
        padding-top: 0.35rem;
        padding-bottom: 0.35rem;
      }
      .manager-pitch {
        padding-bottom: 0.65rem;
      }
      .pitch-line {
        min-height: 36px;
      }
      .player-dot {
        width: 50px;
        height: 36px;
        font-size: 0.56rem;
      }
      .dot-player-name {
        font-size: 0.52rem;
        max-width: 40px;
      }
      .dot-role {
        font-size: 0.43rem;
      }
      .hint {
        display: none;
      }
      .bench-list {
        max-height: 250px;
      }
    }

    @media (min-width: 1600px) {
      /* : xlarge viewport  -  keep the player-dot scale-up
         but DROP the 800px max-width cap so the 95vw base rule applies.
         On a 1920px+ monitor the modal now fills 95% of the width
         (~1824px) instead of being capped at 800px. */
      .partido-modal-root { max-width: 100%; }
      .player-dot {
        /* : xlarge scale  -  bigger than the 56px base
           so the dot feels proportional to the wider modal. The 4-4-2
           line has 4 dots, so on a 1824px modal each dot can claim
           ~440px of horizontal space; 64px leaves room for ~9 chars
           on a single line (e.g. "Vinicius"). */
        width: 82px;
        height: 68px;
        font-size: 0.78rem;
      }
      .dot-player-name {
        font-size: 0.75rem;
        max-width: 58px;
      }
      .dot-role { font-size: 0.6rem; }
    }

    /* ========== : z-index layering for the Formation
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
       MatDialogConfig.panelClass in so
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
  private cdr = inject(ChangeDetectorRef);

  /** Available formations (12 codes from the shared constants). */
  readonly formations: readonly string[] = ALL_FORMATIONS;

  // ========== : tab state ==========

  /** Currently visible tab. Default = 'mine' (manager formation first). */
  readonly activeTab = signal<'mine' | 'rival'>('mine');

  // ========== : stats live data (derived from MatchEvent list) ==========

  /**
   * : full MatchEvent list from the snapshot, defensively defaulted
   * to {@code []} when the SSE feed hasn't reached tick 1 (modal opens while
   * the round is still NOT_STARTED). All derived stats + the timeline read
   * from this signal.
   */
  private readonly eventList = (): MatchEvent[] => this.data.events ?? [];

  /**
   * : derived match stats from {@link eventList}. Returns a flat
   * row-per-stat shape so the template can {@code *ngFor} over a single
   * collection. Each row carries:
   * <ul>
   *   <li>{@code label}  -  display string in Spanish</li>
   *   <li>{@code home} / {@code away}  -  formatted value</li>
   * </ul>
   * Computed eagerly (not as a {@code computed} signal) because Angular's
   * signals don't deeply track {@code data.events} reference changes  - 
   * the SSE feed pushes a NEW MatchState object every tick, so the dialog
   * data is replaced wholesale on each round-live vm$ emission. Calling
   * this getter per change-detection cycle is cheap (8 filter passes over
   * a list that maxes at ~120 events per match) and keeps the data fresh.
   *
   * <p>Stats derived:
   * <ul>
   *   <li>Posesión  -  snapshot possession, not derived from events.</li>
   *   <li>Goles  -  {@code state.score.home/away} (canonical, not GOAL events).</li>
   *   <li>Tiros totales  -  count(SHOT + SHOT_ON_TARGET) for each team.</li>
   *   <li>Tiros a puerta  -  count(SHOT_ON_TARGET) for each team.</li>
   *   <li>Corners  -  count(CORNER) for each team.</li>
   *   <li>Faltas  -  count(FOUL) for each team.</li>
   *   <li>Offsides  -  count(OFFSIDE) for each team.</li>
   *   <li>Tarjetas  -  count(YELLOW_CARD + RED_CARD) shown as "A:R" for each
   *       team (yellows:reds) so the manager can spot ejections at a glance.</li>
   * </ul>
   *
   * <p>Event attribution: each {@link MatchEvent} carries an optional
   * {@code teamId}. We match it against {@code data.homeTeamId} /
   * {@code data.awayTeamId} (both strings) and increment the corresponding
   * bucket. Events without a {@code teamId} are skipped.
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
   * : last 6 events, most recent first. Drives the timeline section
   * below the stats. Capped at 6 so the section stays within ~140px (the
   * modal's available height after the pitch + bench + stats + footer).
   * No pagination  -  the timeline is a glance, not a full event log; the
   * match-card already has a fuller feed on the round-live page.
   */
  recentEvents(): MatchEvent[] {
    return this.eventList().slice(-6).reverse();
  }

  /**
   * : true when the modal has received at least one event. Drives
   * the "stats disponibles cuando arranque el partido" empty state.
   */
  hasEvents(): boolean {
    return this.eventList().length > 0;
  }

  /**
   * : current minute accessor used by the template header tag.
   * Falls back to 0 when the modal opens while the round hasn't ticked
   * yet (NOT_STARTED  ->  minute 0).
   */
  currentMinute(): number {
    return this.data.currentMinute ?? 0;
  }

  /**
   * : home score accessor for the score chip in the modal
   * title bar AND the stats-header-row "score-cell" (replaces the * dash placeholder). Sourced from {@code data.score.home}, falling back
   * to 0 when the SSE feed hasn't reached tick 1.
   */
  homeScore(): number {
    return this.data.score?.home ?? 0;
  }

  /** Away score accessor. */
  awayScore(): number {
    return this.data.score?.away ?? 0;
  }

  /** Remaining manager substitutions. */
  substitutionsRemaining(): number {
    return this.data.substitutionsRemaining ?? 5;
  }

  /** Human-readable event icon for the timeline. */
  getEventIcon(eventType: string): string {
    const iconMap: Record<string, string> = {
      'GOAL': 'GOL',
      'SHOT': 'TIR',
      'SHOT_ON_TARGET': 'TIR',
      'MISS': 'ERR',
      'BLOCK': 'BLO',
      'SAVE': 'ATA',
      'CHANCE_CREATED': 'OC',
      'FOUL': 'FAL',
      'YELLOW_CARD': 'TA',
      'RED_CARD': 'TR',
      'INJURY': 'LES',
      'CORNER': 'COR',
      'OFFSIDE': 'OFF',
      'SUBSTITUTION': 'SUB',
      'CARD': 'TA',
      'TACTICAL_CHANGE': 'TAC'
    };
    return iconMap[eventType] || 'EV';
  }

  displayPosition(position: string | null | undefined): string {
    const map: Record<string, string> = {
      GK: 'ARQ',
      DEF: 'DEF',
      MID: 'MED',
      WINGER: 'EXT',
      ATT: 'DEL'
    };
    return map[(position || '').toUpperCase()] || position || '';
  }

  displayEventDescription(event: MatchEvent | null | undefined): string {
    if (!event) return '';
    const description = event.description || '';
    const playerName = event.playerName || 'Jugador';
    const relatedName = event.relatedPlayerName || '';

    if (event.eventType === 'SUBSTITUTION') {
      const match = description.match(/^Substitution:\s+(.+?)\s+on for\s+(.+)$/i);
      if (match) {
        return `Cambio: entra ${match[1]}, sale ${match[2]}`;
      }
      if (relatedName) {
        return `Cambio: entra ${playerName}, sale ${relatedName}`;
      }
      return description || 'Cambio realizado';
    }

    if (event.eventType === 'INJURY') {
      return `${playerName} se lesionó`;
    }

    if (description === 'Shot saved') {
      return 'Remate atajado';
    }

    if (description === 'Shot missed') {
      return 'Remate desviado';
    }

    if (description === 'Goal') {
      return 'Gol';
    }

    if (description === 'Shot blocked') {
      return 'Remate bloqueado';
    }

    const yellowCardMatch = description.match(/^(.+?) received a yellow card$/i);
    if (yellowCardMatch) {
      return `${yellowCardMatch[1]} recibió amarilla`;
    }

    const redCardMatch = description.match(/^(.+?) received a red card$/i);
    if (redCardMatch) {
      return `${redCardMatch[1]} recibió roja`;
    }

    const foulMatch = description.match(/^(.+?) committed a foul$/i);
    if (foulMatch) {
      return `${foulMatch[1]} cometió una falta`;
    }

    const chanceMatch = description.match(/^Chance created for (.+)$/i);
    if (chanceMatch) {
      return `Chance creada para ${chanceMatch[1]}`;
    }

    const formationMatch = description.match(/^Formation changed from (.+?) to (.+?)(?: \| pixels: (.*))?$/i);
    if (formationMatch) {
      return `Cambio táctico: ${formationMatch[1]} → ${formationMatch[2]}`;
    }

    return description;
  }

  // ========== Manager-tab formation state ==========

  /** Currently selected formation (signal-based for OnPush). */
  readonly selectedFormation = signal<FormationCode>(
    this.normalizeFormation(this.data.currentFormation)
  );

  /**
   * Mutable slot -> playerId map. Initialized from {@code data.currentSlots}
   * and updated by drag-and-drop handlers + formation-change re-flow. The
   * visual pitch template binds to this map to render the player name
   * in each dot.
   */
  slotAssignments: Map<number, string | null> = new Map();

  /**
   * : free-position overrides for the live Partido pitch.
   * Keyed by slot index; values are percentages relative to the pitch.
   */
  freeSlotCoords: Map<number, { x: number; y: number }> = new Map();
  private readonly freePositionRevision = signal(0);

  pendingSubstitutions: PendingPartidoSubstitution[] = [];
  private readonly pendingSubstitutionRevision = signal(0);
  selectedBenchPlayerId: string | null = null;
  selectedNudgeSlotIdx: number | null = null;
  private activeSaveToken: symbol | null = null;

  /** id of the slot currently being dragged (or null when idle). */
  dragSourceSlotIdx: number | null = null;
  dragSourceIsBench = false;
  activePointerDragSlotIdx: number | null = null;
  private pointerDragStartCoords: { x: number; y: number } | null = null;
  private pointerDragMoved = false;
  private suppressNextSlotClick = false;

  /** Slots that were filled by the auto-fill pass  -  render a lock icon. */
  readonly autoFilledSlots = new Map<number, string>();
  readonly autoFillSourcePlayerBySlot = new Map<number, string>();

  /** Warning surfaced when at least one slot could not be auto-filled. */
  warningMsg = '';

  isSubmitting = false;
  errorMsg = '';
  private destroy$ = new Subject<void>();

  /** Position groups used to fill compatible bench players. */
  private static readonly POSITION_GROUPS: Record<string, string[]> = {
    GK:  ['GK'],
    DEF: ['DEF', 'CB', 'LB', 'RB', 'LWB', 'RWB'],
    MID: ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
    ATT: ['ATT', 'ST', 'CF', 'LW', 'RW']
  };

  /** True when formation, slot positions or pending substitutions changed. */
  readonly hasPendingChanges = computed(() => {
    const formationChanged = this.selectedFormation() !== this.data.currentFormation;
    this.freePositionRevision();
    this.pendingSubstitutionRevision();
    const slotsChanged = this.slotsDifferFromInitial();
    return formationChanged || slotsChanged || this.pendingSubstitutions.length > 0;
  });

  // ========== Rival-tab formation ==========

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
    // : initialize slotAssignments from the dialog data.
    for (const s of this.data.currentSlots ?? []) {
      this.slotAssignments.set(s.slotIndex, s.sessionPlayerId || null);
      if (this.isFinitePercent(s.customXPercent) && this.isFinitePercent(s.customYPercent)) {
        this.freeSlotCoords.set(s.slotIndex, {
          x: this.clampPercent(s.customXPercent),
          y: this.clampPercent(s.customYPercent)
        });
      }
    }
    this.sanitizeDuplicateSlotAssignments();
    this.hydrateRememberedPlayerCoords();
    this.autoFillEmptySlots();
    this.focusPreSelectedPlayerIfPresent();
  }

  private focusPreSelectedPlayerIfPresent(): void {
    const playerId = this.data.preSelectedPlayerId;
    if (!playerId) {
      return;
    }
    const slotIdx = this.slotIndexByPlayerId(playerId);
    if (slotIdx === null) {
      return;
    }
    this.selectedNudgeSlotIdx = slotIdx;
    if (this.data.reason === 'INJURY_FORCED_SUBSTITUTION') {
      this.errorMsg = `${this.playerNameById(playerId)} está lesionado: elegí un suplente y tocá su ficha para preparar el cambio. También podés ajustar formación y píxeles antes de guardar.`;
    }
  }

  private slotIndexByPlayerId(playerId: string): number | null {
    for (const [slotIdx, assignedPlayerId] of this.slotAssignments.entries()) {
      if (assignedPlayerId === playerId) {
        return slotIdx;
      }
    }
    return null;
  }

  private normalizeFormation(input: string): FormationCode {
    const normalized = (input || '').replace(/\s/g, '');
    if ((ALL_FORMATIONS as readonly string[]).includes(normalized)) {
      return normalized as FormationCode;
    }
    return '4-4-2';
  }

  // ========== Manager-tab event handlers ==========

  onFormationChange(value: string): void {
    const newFormation = this.normalizeFormation(value);
    this.selectedFormation.set(newFormation);
    const currentXi = Array.from(this.slotAssignments.values()).filter((playerId): playerId is string => !!playerId);
    const autoFilledPlayerIds = new Set(Array.from(this.autoFilledSlots.values()).filter(Boolean));
    const autoFillSourceByPlayerId = new Map<string, string>();
    for (const [slotIdx, playerId] of this.autoFilledSlots) {
      const sourcePlayerId = this.autoFillSourcePlayerBySlot.get(slotIdx);
      if (playerId && sourcePlayerId) {
        autoFillSourceByPlayerId.set(playerId, sourcePlayerId);
      }
    }
    const coordsByPlayerId = new Map<string, { x: number; y: number }>();
    for (const [slotIdx, playerId] of this.slotAssignments) {
      if (!playerId) {
        continue;
      }
      const coords = this.freeSlotCoords.get(slotIdx);
      if (coords) {
        coordsByPlayerId.set(playerId, coords);
      }
    }
    const newLineCount = (FORMATION_LINES_BY_FORMATION[newFormation] ?? []).reduce(
      (sum, line) => sum + line.length, 0
    );
    this.slotAssignments = new Map();
    this.freeSlotCoords.clear();
    this.autoFilledSlots.clear();
    this.autoFillSourcePlayerBySlot.clear();
    this.bumpFreePositionRevision();
    for (let i = 0; i < newLineCount; i++) {
      const playerId = currentXi[i] ?? null;
      this.slotAssignments.set(i, playerId);
      if (playerId) {
        const coords = coordsByPlayerId.get(playerId);
        if (coords) {
          this.freeSlotCoords.set(i, coords);
        }
        if (autoFilledPlayerIds.has(playerId)) {
          this.autoFilledSlots.set(i, playerId);
          const sourcePlayerId = autoFillSourceByPlayerId.get(playerId);
          if (sourcePlayerId) {
            this.autoFillSourcePlayerBySlot.set(i, sourcePlayerId);
          }
        }
      }
    }
    this.errorMsg = '';
    this.selectedNudgeSlotIdx = null;
  }

  /** Tab change handler  -  drives the "Mi Formacion" / "Formacion Rival" UI. */
  onTabChange(idx: number): void {
    this.activeTab.set(idx === 0 ? 'mine' : 'rival');
  }

  // ========== Drag-and-drop handlers ==========

  onSlotDragStart(event: DragEvent, slotIdx: number): void {
    if (!event.dataTransfer) {
      return;
    }
    if (this.isGoalkeeperSlot(slotIdx)) {
      event.preventDefault();
      this.onSlotDragEnd();
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
    if (this.isGoalkeeperSlot(targetSlotIdx) || this.isGoalkeeperSlot(this.dragSourceSlotIdx)) {
      this.onSlotDragEnd();
      return;
    }
    if (this.dragSourceIsBench) {
      const raw = event.dataTransfer?.getData('text/plain') ?? '';
      const playerId = raw.startsWith('bench:') ? raw.substring(6) : null;
      if (!playerId) {
        return;
      }
      const playerOffId = this.playerOffIdForBenchPlacement(targetSlotIdx, playerId);
      if (this.isAutoFilledSlot(targetSlotIdx) && !playerOffId && !this.isConfirmingSameAutoPlayer(targetSlotIdx, playerId)) {
        this.errorMsg = 'No se puede confirmar AUTO porque falta identificar quién sale. Usá un cambio manual o reabrí el modal.';
        this.onSlotDragEnd();
        return;
      }
      if (playerOffId && playerOffId !== playerId) {
        if (!this.registerPendingSubstitution(playerOffId, playerId, targetSlotIdx)) {
          this.onSlotDragEnd();
          return;
        }
      }
      this.slotAssignments.set(targetSlotIdx, playerId);
      this.clearAutoFillMarker(targetSlotIdx);
      this.freeSlotCoords.delete(targetSlotIdx);
      this.bumpFreePositionRevision();
    } else {
      const sourceSlot = this.dragSourceSlotIdx;
      if (sourceSlot === targetSlotIdx) {
        return;
      }
      const sourcePlayer = this.slotAssignments.get(sourceSlot) ?? null;
      const targetPlayer = this.slotAssignments.get(targetSlotIdx) ?? null;
      this.slotAssignments.set(targetSlotIdx, sourcePlayer);
      this.slotAssignments.set(sourceSlot, targetPlayer);
      this.swapFreeSlotCoords(sourceSlot, targetSlotIdx);
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

  onPitchDragOver(event: DragEvent): void {
    if (!event.dataTransfer) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  onPitchDrop(event: DragEvent): void {
    event.preventDefault();
    if (this.dragSourceSlotIdx === null || this.dragSourceIsBench || this.dragSourceSlotIdx < 0) {
      this.onSlotDragEnd();
      return;
    }
    if (this.isGoalkeeperSlot(this.dragSourceSlotIdx)) {
      this.onSlotDragEnd();
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width || !rect.height) {
      this.onSlotDragEnd();
      return;
    }
    const x = this.clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = this.clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    this.freeSlotCoords.set(this.dragSourceSlotIdx, {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    });
    this.bumpFreePositionRevision();
    this.clearAutoFillMarker(this.dragSourceSlotIdx);
    this.onSlotDragEnd();
    this.selectedFormation.set(this.selectedFormation());
  }

  onPitchSlotPointerDown(event: PointerEvent, slotIdx: number): void {
    if (event.button !== 0 || this.isGoalkeeperSlot(slotIdx) || !this.playerAtSlot(slotIdx)) {
      return;
    }
    this.activePointerDragSlotIdx = slotIdx;
    this.selectedNudgeSlotIdx = slotIdx;
    this.pointerDragStartCoords = this.freeSlotCoords.get(slotIdx) ?? this.baseSlotCoords(slotIdx);
    this.pointerDragMoved = false;
    this.suppressNextSlotClick = false;
    this.errorMsg = '';
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }

  onPitchPointerMove(event: PointerEvent): void {
    if (this.activePointerDragSlotIdx === null) {
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const next = this.coordsFromPointerEvent(event, target);
    if (!next) {
      return;
    }
    const slotIdx = this.activePointerDragSlotIdx;
    const current = this.freeSlotCoords.get(slotIdx) ?? this.baseSlotCoords(slotIdx);
    const moved = Math.abs(current.x - next.x) >= 0.05 || Math.abs(current.y - next.y) >= 0.05;
    if (!moved) {
      return;
    }
    this.pointerDragMoved = true;
    this.freeSlotCoords.set(slotIdx, next);
    this.clearAutoFillMarker(slotIdx);
    this.bumpFreePositionRevision();
    this.selectedFormation.set(this.selectedFormation());
    this.cdr.markForCheck();
    event.preventDefault();
  }

  onPitchPointerUp(event: PointerEvent): void {
    if (this.activePointerDragSlotIdx === null) {
      return;
    }
    const slotIdx = this.activePointerDragSlotIdx;
    const start = this.pointerDragStartCoords ?? this.baseSlotCoords(slotIdx);
    const target = event.currentTarget as HTMLElement;
    const next = this.coordsFromPointerEvent(event, target) ?? this.freeSlotCoords.get(slotIdx) ?? start;
    this.freeSlotCoords.set(slotIdx, next);
    this.clearAutoFillMarker(slotIdx);
    this.bumpFreePositionRevision();
    if (this.pointerDragMoved || Math.abs(start.x - next.x) >= 0.05 || Math.abs(start.y - next.y) >= 0.05) {
      this.persistLastNudgeHarnessCase(slotIdx, start, next);
      this.rememberCurrentPlayerCoord(slotIdx, next);
      this.suppressNextSlotClick = true;
    }
    this.activePointerDragSlotIdx = null;
    this.pointerDragStartCoords = null;
    this.pointerDragMoved = false;
    this.selectedFormation.set(this.selectedFormation());
    this.cdr.markForCheck();
    event.preventDefault();
  }

  onPitchPointerCancel(event: PointerEvent): void {
    if (this.activePointerDragSlotIdx === null) {
      return;
    }
    this.activePointerDragSlotIdx = null;
    this.pointerDragStartCoords = null;
    this.pointerDragMoved = false;
    this.cdr.markForCheck();
    event.preventDefault();
  }

  private coordsFromPointerEvent(event: PointerEvent, pitchEl: HTMLElement): { x: number; y: number } | null {
    const rect = pitchEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    const x = this.clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = this.clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  }

  onPitchSlotClick(slotIdx: number): void {
    if (this.suppressNextSlotClick) {
      this.suppressNextSlotClick = false;
      return;
    }
    if (!this.selectedBenchPlayerId) {
      this.selectNudgeSlot(slotIdx);
      return;
    }
    if (this.isGoalkeeperSlot(slotIdx)) {
      this.errorMsg = 'El arquero no se puede reemplazar desde este flujo.';
      return;
    }
    const playerOnId = this.selectedBenchPlayerId;
    const playerOffId = this.playerOffIdForBenchPlacement(slotIdx, playerOnId);
    if (this.isAutoFilledSlot(slotIdx) && !playerOffId && !this.isConfirmingSameAutoPlayer(slotIdx, playerOnId)) {
      this.errorMsg = 'No se puede confirmar AUTO porque falta identificar quién sale. Usá un cambio manual o reabrí el modal.';
      return;
    }
    if (playerOffId && playerOffId !== playerOnId) {
      if (!this.registerPendingSubstitution(playerOffId, playerOnId, slotIdx)) {
        return;
      }
    }
    this.slotAssignments.set(slotIdx, playerOnId);
    this.clearAutoFillMarker(slotIdx);
    this.selectedBenchPlayerId = null;
    this.errorMsg = '';
    this.selectedFormation.set(this.selectedFormation());
  }

  selectNudgeSlot(slotIdx: number): void {
    if (this.isGoalkeeperSlot(slotIdx)) {
      this.selectedNudgeSlotIdx = null;
      this.errorMsg = 'El arquero queda fijo en el área chica y no se puede mover manualmente.';
      return;
    }
    if (!this.playerAtSlot(slotIdx)) {
      this.selectedNudgeSlotIdx = null;
      return;
    }
    this.selectedNudgeSlotIdx = slotIdx;
    this.errorMsg = '';
  }

  selectedNudgePlayerName(): string {
    if (this.selectedNudgeSlotIdx === null) {
      return 'Ningún jugador seleccionado';
    }
    return this.playerAtSlot(this.selectedNudgeSlotIdx)?.name ?? 'Slot vacío';
  }

  selectedNudgeCoordsLabel(): string {
    if (this.selectedNudgeSlotIdx === null) {
      return 'Seleccioná una ficha del XI para ajustar píxeles.';
    }
    const coords = this.freeSlotCoords.get(this.selectedNudgeSlotIdx);
    if (!coords) {
      return 'En posición base de la formación.';
    }
    return `X ${coords.x.toFixed(1)}% · Y ${coords.y.toFixed(1)}%`;
  }

  canNudgeSelectedSlot(): boolean {
    return this.selectedNudgeSlotIdx !== null
      && !this.isGoalkeeperSlot(this.selectedNudgeSlotIdx)
      && !!this.playerAtSlot(this.selectedNudgeSlotIdx);
  }

  nudgeSelectedSlot(dx: number, dy: number): void {
    if (!this.canNudgeSelectedSlot() || this.selectedNudgeSlotIdx === null) {
      return;
    }
    const slotIdx = this.selectedNudgeSlotIdx;
    const base = this.baseSlotCoords(slotIdx);
    const current = this.freeSlotCoords.get(slotIdx) ?? base;
    const next = {
      x: Number(this.clampPercent(current.x + dx).toFixed(2)),
      y: Number(this.clampPercent(current.y + dy).toFixed(2)),
    };
    this.freeSlotCoords.set(slotIdx, {
      x: next.x,
      y: next.y,
    });
    this.persistLastNudgeHarnessCase(slotIdx, current, next);
    this.clearAutoFillMarker(slotIdx);
    this.bumpFreePositionRevision();
    this.selectedFormation.set(this.selectedFormation());
  }

  resetSelectedSlotPosition(): void {
    if (this.selectedNudgeSlotIdx === null) {
      return;
    }
    this.freeSlotCoords.delete(this.selectedNudgeSlotIdx);
    const playerId = this.slotAssignments.get(this.selectedNudgeSlotIdx) ?? null;
    if (playerId) {
      this.forgetRememberedPlayerCoord(playerId);
    }
    this.bumpFreePositionRevision();
    this.selectedFormation.set(this.selectedFormation());
  }

  onBenchPlayerClick(playerId: string): void {
    this.selectedBenchPlayerId = this.selectedBenchPlayerId === playerId ? null : playerId;
    this.errorMsg = '';
  }

  // ========== Auto-fill empty slots ==========

  autoFillEmptySlots(): void {
    this.autoFilledSlots.clear();
    this.autoFillSourcePlayerBySlot.clear();
    this.warningMsg = '';
    this.sanitizeDuplicateSlotAssignments();
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
      this.warningMsg = this.hasLocalDebugPartidoEvent()
        ? `${unfilled} posición(es) quedaron sin AUTO porque no tienen una lesión propia asociada. Revisá el estado de la fecha o usá un cambio manual.`
        : `${unfilled} posición(es) no se pudieron completar; no hay suficientes jugadores en el banquillo con posición compatible.`;
    }
    this.selectedFormation.set(this.selectedFormation());
  }

  private tryFillSlot(slotIdx: number, roleLabel: string): boolean {
    const compatibleGroups = this.compatibleGroupForRole(roleLabel);
    const bench = this.benchPlayers.filter(p => this.isPlayerAvailableForAutoFill(p));
    const pick = bench.find(p => compatibleGroups.includes((p.position || '').toUpperCase()));
    if (!pick) {
      return false;
    }
    const sourcePlayerId = this.resolveAutoFillSourcePlayerId(roleLabel);
    if (this.hasLocalDebugPartidoEvent() && !sourcePlayerId) {
      return false;
    }
    this.slotAssignments.set(slotIdx, pick.sessionPlayerId);
    this.autoFilledSlots.set(slotIdx, pick.sessionPlayerId);
    if (sourcePlayerId) {
      this.autoFillSourcePlayerBySlot.set(slotIdx, sourcePlayerId);
    }
    return true;
  }

  private playerOffIdForBenchPlacement(slotIdx: number, playerOnId: string): string | null {
    const autoSourcePlayerId = this.autoFillSourcePlayerBySlot.get(slotIdx) ?? null;
    if (this.isAutoFilledSlot(slotIdx)) {
      return autoSourcePlayerId;
    }
    const currentSlotPlayerId = this.slotAssignments.get(slotIdx) ?? null;
    return currentSlotPlayerId && currentSlotPlayerId !== playerOnId ? currentSlotPlayerId : null;
  }

  private isConfirmingSameAutoPlayer(slotIdx: number, playerOnId: string): boolean {
    return this.isAutoFilledSlot(slotIdx)
      && !this.autoFillSourcePlayerBySlot.has(slotIdx)
      && (this.slotAssignments.get(slotIdx) ?? null) === playerOnId;
  }

  private resolveAutoFillSourcePlayerId(roleLabel: string): string | null {
    const assigned = new Set(Array.from(this.slotAssignments.values()).filter((id): id is string => !!id));
    const alreadyLinkedSources = new Set(this.autoFillSourcePlayerBySlot.values());
    const compatibleGroups = this.compatibleGroupForRole(roleLabel);
    const squadIds = new Set((this.data.squad ?? []).map(player => player.sessionPlayerId).filter(Boolean));
    const candidates = [...(this.data.events ?? [])]
      .filter(event => event.eventType === 'INJURY' && !!event.playerId)
      .filter(event => !event.teamId || event.teamId === this.data.homeTeamId || squadIds.has(event.playerId ?? ''))
      .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))
      .map(event => event.playerId as string)
      .find(playerId => {
        if (assigned.has(playerId) || alreadyLinkedSources.has(playerId)) {
          return false;
        }
        return true;
      });
    if (!candidates) {
      return null;
    }
    const compatibleCandidate = [...(this.data.events ?? [])]
      .filter(event => event.eventType === 'INJURY' && !!event.playerId)
      .filter(event => !event.teamId || event.teamId === this.data.homeTeamId || squadIds.has(event.playerId ?? ''))
      .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))
      .map(event => event.playerId as string)
      .find(playerId => {
        if (assigned.has(playerId) || alreadyLinkedSources.has(playerId)) {
          return false;
        }
        const player = (this.data.squad ?? []).find(p => p.sessionPlayerId === playerId);
        if (!player) {
          return false;
        }
        const position = (player.position || '').toUpperCase();
        return compatibleGroups.includes(position);
      });
    return compatibleCandidate ?? candidates;
  }

  private hasLocalDebugPartidoEvent(): boolean {
    return (this.data.events ?? []).some(event =>
      event.eventType === 'INJURY'
      && typeof event.description === 'string'
      && /Debug\s*Partido:/i.test(event.description)
    );
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

  private isPlayerAvailableForAutoFill(player: SessionPlayer): boolean {
    return !player.injured && !player.suspended;
  }

  /**
   * Defensive integrity pass for live/Partido state races.
   *
   * During a live match the modal can be opened while SSE, local saved slots and
   * just-confirmed substitutions are converging. If two slots carry the same
   * sessionPlayerId, the UI may look like a 12-player/10-player XI depending on
   * which surface reads it. Keep the first tactical occurrence, clear later
   * duplicates, and let auto-fill repair the empty slot from the bench.
   */
  private sanitizeDuplicateSlotAssignments(): void {
    const seen = new Set<string>();
    let changed = false;
    for (const [slotIdx, playerId] of Array.from(this.slotAssignments.entries()).sort((a, b) => a[0] - b[0])) {
      if (!playerId) {
        continue;
      }
      if (seen.has(playerId)) {
        this.slotAssignments.set(slotIdx, null);
        this.freeSlotCoords.delete(slotIdx);
        this.clearAutoFillMarker(slotIdx);
        changed = true;
        continue;
      }
      seen.add(playerId);
    }
    if (changed) {
      this.bumpFreePositionRevision();
      if (!this.warningMsg) {
        this.warningMsg = 'Se corrigió un XI duplicado antes de guardar.';
      }
    }
  }

  isFreePositionedSlot(slotIdx: number): boolean {
    return this.freeSlotCoords.has(slotIdx);
  }

  isGoalkeeperSlot(slotIdx: number): boolean {
    if (slotIdx < 0) {
      return false;
    }
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let current = 0;
    for (const line of lines) {
      for (const role of line) {
        if (current === slotIdx) {
          return (role || '').toUpperCase() === 'GK';
        }
        current++;
      }
    }
    const player = this.playerAtSlot(slotIdx);
    return (player?.position || '').toUpperCase() === 'GK';
  }

  freePositionLeftPercent(slotIdx: number): number | null {
    const coords = this.freeSlotCoords.get(slotIdx);
    if (!coords) {
      return null;
    }
    return coords.x;
  }

  freePositionTopPercent(slotIdx: number): number | null {
    const coords = this.freeSlotCoords.get(slotIdx);
    if (!coords) {
      return null;
    }
    return coords.y;
  }

  private baseSlotCoords(slotIdx: number): { x: number; y: number } {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let current = 0;
    const lineGap = lines.length <= 1 ? 50 : 100 / (lines.length - 1);
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        if (current === slotIdx) {
          const x = line.length <= 1
            ? 50
            : ((dotIdx + 1) / (line.length + 1)) * 100;
          const y = lines.length <= 1 ? 50 : lineIdx * lineGap;
          return {
            x: Number(this.clampPercent(x).toFixed(2)),
            y: Number(this.clampPercent(y).toFixed(2)),
          };
        }
        current++;
      }
    }
    return { x: 50, y: 50 };
  }

  private roleLabelForSlot(slotIdx: number): string | null {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    let current = 0;
    for (const line of lines) {
      for (const role of line) {
        if (current === slotIdx) {
          return role;
        }
        current++;
      }
    }
    return null;
  }

  private persistLastNudgeHarnessCase(
    slotIdx: number,
    from: { x: number; y: number },
    target: { x: number; y: number }
  ): void {
    const player = this.playerAtSlot(slotIdx);
    if (!player || this.isGoalkeeperSlot(slotIdx)) {
      return;
    }
    const distance = Math.hypot(target.x - from.x, target.y - from.y);
    if (!Number.isFinite(distance) || distance < 0.5) {
      return;
    }
    const role = this.roleLabelForSlot(slotIdx);
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      source: 'partido-modal-nudge',
      formation: this.selectedFormation(),
      playerId: player.sessionPlayerId,
      playerName: player.name,
      playerPosition: player.position ?? role,
      playerRole: role,
      slotId: null,
      fromXPercent: Number(from.x.toFixed(3)),
      fromYPercent: Number(from.y.toFixed(3)),
      targetXPercent: Number(target.x.toFixed(3)),
      targetYPercent: Number(target.y.toFixed(3)),
      deltaXPercent: Number((target.x - from.x).toFixed(3)),
      deltaYPercent: Number((target.y - from.y).toFixed(3)),
      coachReadTitle: 'Partido modal nudge',
      coachReadBody: `${player.name}: ${from.x.toFixed(1)},${from.y.toFixed(1)} -> ${target.x.toFixed(1)},${target.y.toFixed(1)}`,
    };
    try {
      window.localStorage.setItem('manager:last-modal-position-move', JSON.stringify(payload));
    } catch {
      // Local QA metadata is best-effort; the user-facing save flow must continue.
    }
  }

  private clearAutoFillMarker(slotIdx: number): void {
    if (this.autoFilledSlots.has(slotIdx)) {
      this.autoFilledSlots.delete(slotIdx);
    }
    this.autoFillSourcePlayerBySlot.delete(slotIdx);
  }

  // ========== Pitch helpers ==========

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
    for (const [slotIdx, pid] of this.slotAssignments) {
      if (pid && !this.autoFilledSlots.has(slotIdx)) {
        assigned.add(pid);
      }
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

  // ========== : rival-tab helpers ==========

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

  /** Role label for a rival dot  -  no player name (rival XI not exposed). */
  getRivalDotLabel(lineIdx: number, dotIdx: number): string {
    const lines = FORMATION_LINES_BY_FORMATION[this.rivalFormation()];
    if (!lines || !lines[lineIdx]) {
      return '';
    }
    return lines[lineIdx][dotIdx] ?? '';
  }

  // ========== : diff + save ==========

  private slotsDifferFromInitial(): boolean {
    const initial = new Map<number, string>();
    const initialCoords = new Map<number, { x: number; y: number }>();
    for (const s of this.data.currentSlots ?? []) {
      initial.set(s.slotIndex, s.sessionPlayerId || '');
      if (this.isFinitePercent(s.customXPercent) && this.isFinitePercent(s.customYPercent)) {
        initialCoords.set(s.slotIndex, {
          x: this.clampPercent(s.customXPercent),
          y: this.clampPercent(s.customYPercent)
        });
      }
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
    if (this.freeSlotCoords.size !== initialCoords.size) {
      return true;
    }
    for (const [idx, coords] of this.freeSlotCoords) {
      const initialSlotCoords = initialCoords.get(idx);
      if (!initialSlotCoords) {
        return true;
      }
      if (Math.abs(coords.x - initialSlotCoords.x) > 0.001
          || Math.abs(coords.y - initialSlotCoords.y) > 0.001) {
        return true;
      }
    }
    return false;
  }

  private buildSlotListForBackend(): Array<{
    sessionPlayerId: string;
    position: string;
    slotIndex: number;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }> {
    const lines = FORMATION_LINES_BY_FORMATION[this.selectedFormation()] ?? [];
    const slots: Array<{
      sessionPlayerId: string;
      position: string;
      slotIndex: number;
      customXPercent?: number | null;
      customYPercent?: number | null;
    }> = [];
    let slotIdx = 0;
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (let dotIdx = 0; dotIdx < line.length; dotIdx++) {
        const coords = this.freeSlotCoords.get(slotIdx);
        slots.push({
          sessionPlayerId: this.slotAssignments.get(slotIdx) ?? '',
          position: line[dotIdx],
          slotIndex: slotIdx,
          customXPercent: coords?.x ?? null,
          customYPercent: coords?.y ?? null
        });
        slotIdx++;
      }
    }
    return slots;
  }

  private swapFreeSlotCoords(a: number, b: number): void {
    const aCoords = this.freeSlotCoords.get(a);
    const bCoords = this.freeSlotCoords.get(b);
    if (bCoords) {
      this.freeSlotCoords.set(a, bCoords);
    } else {
      this.freeSlotCoords.delete(a);
    }
    if (aCoords) {
      this.freeSlotCoords.set(b, aCoords);
    } else {
      this.freeSlotCoords.delete(b);
    }
    this.bumpFreePositionRevision();
  }

  private clampPercent(value: number): number {
    if (!Number.isFinite(value)) {
      return 50;
    }
    return Math.max(0, Math.min(100, value));
  }

  private isFinitePercent(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private bumpFreePositionRevision(): void {
    this.freePositionRevision.update(value => value + 1);
  }

  private rememberedPlayerCoordsStorageKey(): string {
    return `manager:partido-player-coords:${this.data.matchId}`;
  }

  private readRememberedPlayerCoords(): Record<string, { x: number; y: number }> {
    try {
      const raw = window.localStorage.getItem(this.rememberedPlayerCoordsStorageKey());
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, { x?: number; y?: number }>;
      const clean: Record<string, { x: number; y: number }> = {};
      for (const [playerId, coords] of Object.entries(parsed ?? {})) {
        if (this.isFinitePercent(coords?.x) && this.isFinitePercent(coords?.y)) {
          clean[playerId] = {
            x: this.clampPercent(coords.x),
            y: this.clampPercent(coords.y)
          };
        }
      }
      return clean;
    } catch {
      return {};
    }
  }

  private writeRememberedPlayerCoords(coordsByPlayerId: Record<string, { x: number; y: number }>): void {
    try {
      window.localStorage.setItem(this.rememberedPlayerCoordsStorageKey(), JSON.stringify(coordsByPlayerId));
    } catch {
      // Non-fatal: service memory/backend save still carry the tactical change.
    }
  }

  private hydrateRememberedPlayerCoords(): void {
    const remembered = this.readRememberedPlayerCoords();
    let changed = false;
    for (const [slotIdx, playerId] of this.slotAssignments) {
      if (!playerId) {
        continue;
      }
      const coords = remembered[playerId];
      if (!coords) {
        continue;
      }
      this.freeSlotCoords.set(slotIdx, {
        x: this.clampPercent(coords.x),
        y: this.clampPercent(coords.y)
      });
      changed = true;
    }
    if (changed) {
      this.bumpFreePositionRevision();
    }
  }

  private rememberPlayerCoordsForSavedSlots(slots: Array<{
    sessionPlayerId: string;
    customXPercent?: number | null;
    customYPercent?: number | null;
  }>): void {
    const remembered = this.readRememberedPlayerCoords();
    for (const slot of slots) {
      if (!slot.sessionPlayerId) {
        continue;
      }
      if (this.isFinitePercent(slot.customXPercent) && this.isFinitePercent(slot.customYPercent)) {
        remembered[slot.sessionPlayerId] = {
          x: this.clampPercent(slot.customXPercent),
          y: this.clampPercent(slot.customYPercent)
        };
      } else {
        delete remembered[slot.sessionPlayerId];
      }
    }
    this.writeRememberedPlayerCoords(remembered);
  }

  private rememberCurrentPlayerCoord(slotIdx: number, coords: { x: number; y: number }): void {
    const playerId = this.slotAssignments.get(slotIdx);
    if (!playerId) {
      return;
    }
    const remembered = this.readRememberedPlayerCoords();
    remembered[playerId] = {
      x: this.clampPercent(coords.x),
      y: this.clampPercent(coords.y)
    };
    this.writeRememberedPlayerCoords(remembered);
  }

  private forgetRememberedPlayerCoord(playerId: string): void {
    const remembered = this.readRememberedPlayerCoords();
    if (!(playerId in remembered)) {
      return;
    }
    delete remembered[playerId];
    this.writeRememberedPlayerCoords(remembered);
  }

  private registerPendingSubstitution(playerOffId: string, playerOnId: string, slotIndex: number): boolean {
    const nextSubstitutions = this.pendingSubstitutions
      .filter(sub => sub.playerOffId !== playerOffId && sub.playerOnId !== playerOnId);

    if (nextSubstitutions.length >= this.substitutionsRemaining()) {
      this.errorMsg = 'No quedan sustituciones disponibles para preparar otro cambio.';
      return false;
    }
    this.pendingSubstitutions = [
      ...nextSubstitutions,
      { playerOffId, playerOnId, slotIndex }
    ];
    this.pendingSubstitutionRevision.update(value => value + 1);
    return true;
  }

  pendingSubstitutionRows(): Array<{
    playerOffName: string;
    playerOnName: string;
    slotIndex: number;
  }> {
    this.pendingSubstitutionRevision();
    return this.pendingSubstitutions.map(sub => ({
      playerOffName: this.playerNameById(sub.playerOffId),
      playerOnName: this.playerNameById(sub.playerOnId),
      slotIndex: sub.slotIndex
    }));
  }

  removePendingSubstitution(index: number): void {
    const sub = this.pendingSubstitutions[index];
    if (!sub) {
      return;
    }
    const currentSlotPlayerId = this.slotAssignments.get(sub.slotIndex) ?? null;
    if (!currentSlotPlayerId || currentSlotPlayerId === sub.playerOnId) {
      this.slotAssignments.set(sub.slotIndex, sub.playerOffId);
      this.freeSlotCoords.delete(sub.slotIndex);
      this.clearAutoFillMarker(sub.slotIndex);
      this.bumpFreePositionRevision();
    }
    this.pendingSubstitutions = this.pendingSubstitutions.filter((_item, idx) => idx !== index);
    this.pendingSubstitutionRevision.update(value => value + 1);
    this.selectedBenchPlayerId = null;
    this.errorMsg = '';
    this.selectedFormation.set(this.selectedFormation());
  }

  private playerNameById(playerId: string): string {
    return (this.data.squad ?? []).find(p => p.sessionPlayerId === playerId)?.name ?? playerId;
  }

  // ========== Footer actions ==========

  /** Persist formation, position and substitution changes. */
  save(): void {
    if (this.isSubmitting) {
      return;
    }
    if (this.autoFilledSlots.size > 0) {
      this.errorMsg = 'No se puede guardar con jugadores AUTO: elegí manualmente el reemplazo para que cuente como sustitución real.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.hasPendingChanges()) {
      // No changes  -  close immediately without API call.
      this.dialogRef.close({ success: false, reason: 'no-change' });
      return;
    }
    this.isSubmitting = true;
    const saveToken = Symbol('partido-save');
    this.activeSaveToken = saveToken;
    window.setTimeout(() => {
      if (this.activeSaveToken === saveToken && this.isSubmitting) {
        this.isSubmitting = false;
        this.errorMsg = 'No hubo respuesta al guardar el cambio del partido. Probá de nuevo o reiniciá el live desde el harness.';
        this.cdr.markForCheck();
      }
    }, 15000);
    this.errorMsg = '';
    this.sanitizeDuplicateSlotAssignments();
    if (this.autoFilledSlots.size > 0) {
      this.isSubmitting = false;
      this.activeSaveToken = null;
      this.errorMsg = 'No se puede guardar con jugadores AUTO: elegí manualmente el reemplazo para que cuente como sustitución real.';
      this.cdr.markForCheck();
      return;
    }
    const slots = this.buildSlotListForBackend();
    this.rememberPlayerCoordsForSavedSlots(slots);
    if (slots.some(slot => !slot.sessionPlayerId)) {
      this.isSubmitting = false;
      this.errorMsg = 'No se puede confirmar: todos los slots visibles deben tener un jugador real. Cerrá y reabrí el modal si ves sólo roles.';
      return;
    }
    const substitutionFlow$ = this.pendingSubstitutions.length > 0
      ? from(this.pendingSubstitutions).pipe(
          concatMap(sub => this.engineService.substitutePlayer(
            this.data.matchId,
            sub.playerOffId,
            sub.playerOnId
          )),
          toArray()
        )
      : of([]);

    substitutionFlow$.pipe(
      switchMap((substitutionResults) => {
        const failedSubstitution = substitutionResults.find(result => !result.success && !this.isAlreadyAppliedSubstitutionResult(result));
        if (failedSubstitution) {
          return of({
            formationResult: null,
            substitutionResults,
            failedSubstitution
          });
        }
        return this.engineService.changeFormation(this.data.matchId, slots, this.selectedFormation()).pipe(
          switchMap(formationResult => of({
            formationResult,
            substitutionResults,
            failedSubstitution: null
          }))
        );
      }),
      timeout(15000),
      finalize(() => {
        this.isSubmitting = false;
        if (this.activeSaveToken === saveToken) {
          this.activeSaveToken = null;
        }
        this.cdr.markForCheck();
      }),
      takeUntil(this.destroy$)
    )
      .subscribe({
        next: ({ formationResult, substitutionResults, failedSubstitution }) => {
          if (failedSubstitution) {
            this.errorMsg = failedSubstitution.error || 'Cambio de jugador rechazado por el servidor';
            this.cdr.markForCheck();
            return;
          }
          if (formationResult?.success) {
            const appliedSubstitutions = this.pendingSubstitutions.length;
            this.snackBar.open(
              appliedSubstitutions > 0
                ? `Cambios aplicados (${appliedSubstitutions}) y formación ${this.selectedFormation()} guardada`
                : `Formación cambiada a ${this.selectedFormation()}`,
              'OK',
              { duration: 3000, panelClass: 'success-toast' }
            );
            this.dialogRef.close({
              success: true,
              result: formationResult,
              substitutionResults,
              formation: this.selectedFormation(),
              savedSlots: slots,
              substitutionsApplied: appliedSubstitutions,
              substitutions: this.pendingSubstitutions.map(sub => ({
                playerOffId: sub.playerOffId,
                playerOnId: sub.playerOnId
              }))
            });
          } else {
            this.errorMsg = formationResult?.error || 'Cambio de formación rechazado por el servidor';
          }
        },
        error: (err) => {
          this.errorMsg = this.describeSaveError(err);
          this.cdr.markForCheck();
          if (isDevMode()) {
            console.error('[PARTIDO-MODAL] error', err);
          }
        }
      });
  }

  private isAlreadyAppliedSubstitutionResult(result: { success: boolean; error?: string | null }): boolean {
    if (result.success) {
      return false;
    }
    const error = (result.error || '').toLowerCase();
    return error.includes('already been substituted off')
      || error.includes('already been substituted on')
      || error.includes('is on the pitch already');
  }

  private describeSaveError(err: unknown): string {
    const candidate = err as {
      status?: number;
      statusText?: string;
      error?: unknown;
      message?: string;
    };
    const backendError = candidate?.error;
    if (backendError && typeof backendError === 'object') {
      const shaped = backendError as { error?: string; message?: string; detail?: string; code?: string };
      const message = shaped.error ?? shaped.message ?? shaped.detail;
      if (message) {
        return `${candidate.status ?? 'Error'} ${shaped.code ? shaped.code + ': ' : ''}${message}`;
      }
    }
    if (typeof backendError === 'string' && backendError.trim()) {
      return `${candidate.status ?? 'Error'} ${backendError}`;
    }
    if (candidate?.message) {
      if (!candidate.status) {
        return `Error de red al intentar aplicar cambios del partido: ${candidate.message}`;
      }
      return `${candidate.status ?? 'Error'} ${candidate.message}`;
    }
    return 'Error de red al intentar aplicar cambios del partido';
  }

  /**
   * : footer "Descartar" handler. Closes the dialog
   * without saving  -  the dialog opens again with the original
   * formation (SSE-drel usuario vm$ is untouched).
   */
  discard(): void {
    this.dialogRef.close({ success: false, reason: 'discarded' });
  }

  /** @deprecated Use {@link discard} directly. */
  cancel(): void {
    this.discard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
