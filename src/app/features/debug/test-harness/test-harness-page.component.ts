import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { catchError, concatMap, forkJoin, from, map, of, switchMap } from 'rxjs';

import { CareerService } from '../../../core/services/career.service';
import { Fixture } from '../../../core/services/career.model';
import { environment } from '../../../environments/environment';
import { MatchDetailApiService } from '../../match-detail/services/match-detail-api.service';
import { MatchDetail, MatchEvent, TimelineSnapshot } from '../../match-detail/models/match-detail.model';
import { V24MatchDetailPageComponent } from '../../match-detail/pages/v24-match-detail-page.component';
import { SquadEditorModalComponent } from '../../../components/squad-editor-modal/squad-editor-modal.component';
import { SessionPlayer } from '../../../shared/models/player.model';
import {
  FORMATION_CODES,
  FormationCode,
  MatchFixture,
  ScenarioMatrixRow,
  TestHarnessMatchRow,
  TeamStyle,
} from '../models/test-harness.model';
import { TestHarnessService } from '../services/test-harness.service';

interface RoundGroup {
  round: number;
  byeTeam: string | null;
  matches: TestHarnessMatchRow[];
}

interface FormationReplayResult {
  formation: FormationCode;
  homeGoals: number | null;
  awayGoals: number | null;
  homePossession: number | null;
  awayPossession: number | null;
  homeShots: number | null;
  awayShots: number | null;
  homeXg: number | null;
  awayXg: number | null;
  homeCentralShots: number;
  homeWideShots: number;
  homeLongShots: number;
  awayCentralShots: number;
  awayWideShots: number;
  awayLongShots: number;
}

interface TeamStyleOption {
  value: TeamStyle;
  label: string;
  hint: string;
}

const TIMELINE_DEBOUNCE_MS = 150;
const TIMELINE_MAX_MINUTE = 90;
const TIMELINE_STEP = 5;

/**
 * V24D24.2: Default seed for the "Replay with seed" button. Same number as
 * the regression-test baseline so Iván can reproduce a known result with
 * one click. The user is free to override.
 */
const DEFAULT_REPLAY_SEED = 12345;

/**
 * V24D24: Test-Harness UI page (4-panel layout).
 *
 * <p>Route: {@code /debug/test-harness}.
 *
 * <p>Layout (desktop, ≥768px):
 * <pre>
 * +-----------------+-----------------+
 * |  Panel A        |  Panel B        |
 * |  V24 match      |  Formation      |
 * |  detail (reused)|  select + btns  |
 * +-----------------+-----------------+
 * |  Panel C (match list, full width)  |
 * +-----------------------------------+
 * |  Panel D (timeline scrubber, full) |
 * +-----------------------------------+
 * </pre>
 *
 * <p>Backend gating: this UI is a debug surface — the backend is
 * profile-gated ({@code dev | local | test}). The /detail and /timeline
 * endpoints return 404 in prod. REVISOR runs the smoke against the
 * dev profile.
 */
@Component({
  selector: 'app-test-harness-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    V24MatchDetailPageComponent,
  ],
  template: `
    <div class="test-harness-page">
      <header class="page-header">
        <h1 class="page-title">Test Harness</h1>
        <p class="page-subtitle">
          Debug surface — change formation, replay, and inspect match detail.
        </p>
        <a routerLink="/dashboard" class="link link-back" aria-label="Back to dashboard">
          &larr; Back to dashboard
        </a>
      </header>

      <!-- Empty state: no career active -->
      <div *ngIf="!loading() && !loadError() && !hasCareer()" class="state-container" role="status">
        <div class="state-icon info-icon" aria-hidden="true">i</div>
        <h2 class="state-title">No active career</h2>
        <p class="state-text">You need an active career to use the test harness.</p>
        <a routerLink="/career/setup" class="btn btn-primary">Set up a career</a>
      </div>

      <!-- Load error -->
      <div *ngIf="!loading() && loadError()" class="state-container" role="alert">
        <div class="state-icon error-icon" aria-hidden="true">!</div>
        <p class="error-text">{{ loadError() }}</p>
        <button (click)="reload()" class="btn btn-primary" aria-label="Retry loading">Retry</button>
      </div>

      <!-- Loading state -->
      <div *ngIf="loading()" class="state-container" role="status" aria-live="polite">
        <div class="state-spinner" aria-hidden="true"></div>
        <p class="loading-text">Loading test harness…</p>
      </div>

      <!-- Main grid -->
      <div *ngIf="!loading() && !loadError() && hasCareer()" class="test-harness-grid">
        <!-- Panel A: Reused V24 match detail (F2) -->
        <section class="panel panel-a" aria-labelledby="panel-a-heading">
          <h2 id="panel-a-heading" class="panel-title">Panel A · Match Detail</h2>
          <p class="panel-hint" *ngIf="!selectedMatchId()">
            Select a match in Panel C to view its V24 detail.
          </p>
          <app-v24-match-detail-page
            *ngIf="selectedMatchId() && detailPanelVisible()"
            [inputCareerId]="careerId()"
            [inputMatchId]="selectedMatchId()"
          ></app-v24-match-detail-page>
        </section>

        <!-- Panel B: Mutation controls -->
        <section class="panel panel-b" aria-labelledby="panel-b-heading">
          <h2 id="panel-b-heading" class="panel-title">Panel B · Mutations</h2>

          <div class="control-group">
            <mat-form-field appearance="outline" class="formation-field">
              <mat-label>Formation</mat-label>
              <mat-select
                [(ngModel)]="selectedFormationModel"
                (selectionChange)="onFormationChange($event.value)"
                aria-label="Select formation"
              >
                <mat-option *ngFor="let code of formationCodes" [value]="code">
                  {{ code }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <div class="button-stack">
              <button
                mat-raised-button
                color="primary"
                (click)="applyFormation()"
                [disabled]="mutationInFlight() || !selectedFormationModel"
                aria-label="Apply selected formation"
              >
                Set Formation
              </button>
              <button
                mat-stroked-button
                (click)="onResetInjuries()"
                [disabled]="mutationInFlight()"
                aria-label="Reset all injuries"
              >
                Reset Injuries
              </button>
              <button
                mat-stroked-button
                (click)="onReplaceFixtures()"
                [disabled]="mutationInFlight()"
                aria-label="Replace fixtures with a Barcelona rival"
              >
                Replace Fixtures
              </button>
              <button
                mat-stroked-button
                (click)="openSquadEditor()"
                [disabled]="mutationInFlight()"
                aria-label="Open visual squad editor"
              >
                Open squad editor
              </button>
            </div>
          </div>

          <!-- V24D24.2: replay-with-seed + simulate-round block.
               Kept in its own control-group separated by a subtle divider so
               the layout stays predictable when more controls land later. -->
          <div class="control-group control-group-replay">
            <div class="control-group-divider" aria-hidden="true"></div>

            <mat-form-field appearance="outline" class="seed-field">
              <mat-label>Seed</mat-label>
              <input
                matInput
                type="number"
                [(ngModel)]="seedInputModel"
                (ngModelChange)="onSeedChange($event)"
                placeholder="12345"
                aria-label="Replay seed (number, empty for non-reproducible)"
              />
            </mat-form-field>

            <mat-form-field appearance="outline" class="style-field">
              <mat-label>Focus</mat-label>
              <mat-select
                [(ngModel)]="selectedStyleModel"
                aria-label="Select tactical focus for replay"
              >
                <mat-option *ngFor="let option of teamStyleOptions" [value]="option.value">
                  {{ option.label }}
                </mat-option>
              </mat-select>
              <mat-hint>{{ selectedStyleHint() }}</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="round-field">
              <mat-label>Round</mat-label>
              <mat-select
                [(ngModel)]="selectedRoundModel"
                (selectionChange)="onRoundSelect($event.value)"
                aria-label="Select round to simulate"
              >
                <mat-option *ngFor="let r of rounds()" [value]="r.round">
                  Round {{ r.round }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <div class="button-stack">
              <button
                mat-raised-button
                color="primary"
                (click)="onReplayWithSeed()"
                [disabled]="mutationInFlight() || !selectedMatchId()"
                aria-label="Replay selected match with seed"
              >
                Replay with seed
              </button>
              <button
                mat-stroked-button
                (click)="onRunFormationMatrix()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Replay selected match with every formation and the same seed"
              >
                Formation matrix
              </button>
              <button
                mat-stroked-button
                (click)="onRunScenarioMatrix()"
                [disabled]="mutationInFlight() || !selectedMatchId() || !selectedMatchIncludesUserTeam()"
                aria-label="Run controlled live tactical scenarios for the selected match and seed"
              >
                Scenario matrix
              </button>
              <button
                mat-stroked-button
                (click)="onSimulateRound()"
                [disabled]="mutationInFlight() || selectedRoundModel === null"
                aria-label="Simulate selected round"
              >
                Simulate round {{ selectedRoundModel ?? '—' }}
              </button>
            </div>

            <p
              *ngIf="selectedMatchId() && !selectedMatchIncludesUserTeam()"
              class="harness-warning"
              role="status"
            >
              Formation matrix affects only {{ userTeamName() || 'your team' }}.
              Pick a match involving that team to test lineup changes.
            </p>

            <div *ngIf="formationReplayResults().length > 0" class="formation-matrix">
              <div class="matrix-header">
                <strong>Formation matrix</strong>
                <span>Same match + seed {{ seedInputModel ?? 'auto' }} + {{ selectedStyleLabel() }}</span>
                <button type="button" class="matrix-export" (click)="copyFormationMatrixJson()">
                  Copy JSON
                </button>
                <button type="button" class="matrix-export" (click)="downloadFormationMatrixCsv()">
                  CSV
                </button>
              </div>
              <div class="matrix-table" role="table" aria-label="Formation replay comparison">
                <div class="matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Form.</span>
                  <span role="columnheader">Score</span>
                  <span role="columnheader">Poss.</span>
                  <span role="columnheader">Shots</span>
                  <span role="columnheader">xG</span>
                  <span role="columnheader">Zones C/W/L</span>
                </div>
                <div
                  *ngFor="let row of formationReplayResults(); trackBy: trackByFormationReplay"
                  class="matrix-row"
                  role="row"
                >
                  <span role="cell">{{ row.formation }}</span>
                  <span role="cell">{{ row.homeGoals ?? '—' }}-{{ row.awayGoals ?? '—' }}</span>
                  <span role="cell">{{ fmtPct(row.homePossession) }} / {{ fmtPct(row.awayPossession) }}</span>
                  <span role="cell">{{ row.homeShots ?? '-' }} / {{ row.awayShots ?? '-' }}</span>
                  <span role="cell">{{ fmtXg(row.homeXg) }} / {{ fmtXg(row.awayXg) }}</span>
                  <span role="cell">
                    {{ row.homeCentralShots }}/{{ row.homeWideShots }}/{{ row.homeLongShots }}
                    /
                    {{ row.awayCentralShots }}/{{ row.awayWideShots }}/{{ row.awayLongShots }}
                  </span>
                </div>
              </div>
            </div>

            <div *ngIf="scenarioMatrixResults().length > 0" class="formation-matrix">
              <div class="matrix-header">
                <strong>Scenario matrix</strong>
                <span>Same match + seed {{ seedInputModel ?? 'auto' }} · live tactical changes</span>
                <button type="button" class="matrix-export" (click)="copyScenarioMatrixJson()">
                  Copy JSON
                </button>
              </div>
              <div class="matrix-table" role="table" aria-label="Live tactical scenario comparison">
                <div class="matrix-row matrix-row-head" role="row">
                  <span role="columnheader">Scenario</span>
                  <span role="columnheader">Action</span>
                  <span role="columnheader">Score</span>
                  <span role="columnheader">Poss.</span>
                  <span role="columnheader">Shots</span>
                  <span role="columnheader">xG</span>
                  <span role="columnheader">Zones C/W/L</span>
                </div>
                <div
                  *ngFor="let row of scenarioMatrixResults(); trackBy: trackByScenarioMatrix"
                  class="matrix-row"
                  role="row"
                >
                  <span role="cell" [title]="row.description">
                    {{ row.scenario }}
                    <small *ngIf="row.changeMinute !== null">
                      m{{ row.changeMinute }}
                    </small>
                  </span>
                  <span role="cell" [title]="row.actionDetail">
                    {{ actionLabel(row) }}
                  </span>
                  <span role="cell">{{ row.homeGoals }}-{{ row.awayGoals }}</span>
                  <span role="cell">{{ fmtPct(row.homePossession) }} / {{ fmtPct(row.awayPossession) }}</span>
                  <span role="cell">{{ row.homeShots }} / {{ row.awayShots }}</span>
                  <span role="cell">{{ fmtXg(row.homeXg) }} / {{ fmtXg(row.awayXg) }}</span>
                  <span role="cell">
                    {{ row.homeCentralShots }}/{{ row.homeWideShots }}/{{ row.homeLongShots }}
                    /
                    {{ row.awayCentralShots }}/{{ row.awayWideShots }}/{{ row.awayLongShots }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Panel C: Match list (full width) -->
        <section class="panel panel-c" aria-labelledby="panel-c-heading">
          <h2 id="panel-c-heading" class="panel-title">Panel C · Matches</h2>
          <p class="panel-hint">Click a match to load its detail in Panel A and the scrubber in Panel D.</p>

          <div *ngIf="rounds().length === 0" class="empty-rounds">
            <p>No matches in the active career.</p>
          </div>

          <ul class="rounds-list" *ngIf="rounds().length > 0">
            <li *ngFor="let r of rounds(); trackBy: trackByRound" class="round-block">
              <div class="round-header">
                <span class="round-label">Round {{ r.round }}</span>
                <span *ngIf="r.byeTeam" class="round-bye">BYE: {{ r.byeTeam }}</span>
              </div>
              <ul class="match-list">
                <li
                  *ngFor="let m of r.matches; trackBy: trackByMatchId"
                  class="match-row"
                  [class.match-row-selected]="m.matchId === selectedMatchId()"
                  (click)="selectMatch(m)"
                  (keyup.enter)="selectMatch(m)"
                  tabindex="0"
                  [attr.aria-pressed]="m.matchId === selectedMatchId()"
                  [attr.aria-label]="'Match ' + m.homeTeamName + ' vs ' + m.awayTeamName + ', status ' + m.status"
                >
                  <span class="match-teams">
                    <span class="team-home">{{ m.homeTeamName }}</span>
                    <span class="team-sep">vs</span>
                    <span class="team-away">{{ m.awayTeamName }}</span>
                  </span>
                  <span class="match-score">
                    <ng-container *ngIf="m.homeGoals !== null && m.awayGoals !== null; else pendingScore">
                      {{ m.homeGoals }} - {{ m.awayGoals }}
                    </ng-container>
                    <ng-template #pendingScore>—</ng-template>
                  </span>
                  <span class="match-status" [attr.data-status]="m.status">{{ m.status }}</span>
                </li>
              </ul>
            </li>
          </ul>
        </section>

        <!-- Panel D: Timeline scrubber (F3) -->
        <section class="panel panel-d" aria-labelledby="panel-d-heading">
          <h2 id="panel-d-heading" class="panel-title">Panel D · Timeline Scrubber</h2>
          <p class="panel-hint" *ngIf="!selectedMatchId()">
            Select a match in Panel C to use the timeline scrubber.
          </p>

          <div *ngIf="selectedMatchId()" class="scrubber-content">
            <div class="scrubber-header">
              <span class="minute-label">Minute {{ selectedMinute() }}</span>
              <span *ngIf="timelineSnapshot() as snap" class="match-context">
                of {{ snap.events.length }} events
              </span>
            </div>

            <input
              type="range"
              class="minute-slider"
              min="0"
              [max]="TIMELINE_MAX_MINUTE"
              [step]="TIMELINE_STEP"
              [value]="selectedMinute()"
              (input)="onSliderInput($event)"
              [attr.aria-label]="'Match minute, currently ' + selectedMinute()"
              [attr.aria-valuemin]="0"
              [attr.aria-valuemax]="TIMELINE_MAX_MINUTE"
              [attr.aria-valuenow]="selectedMinute()"
              [disabled]="timelineLoading()"
            />

            <div class="minute-ticks" aria-hidden="true">
              <span *ngFor="let m of minuteTicks" class="tick" [class.tick-active]="m === selectedMinute()">
                {{ m }}
              </span>
            </div>

            <!-- Loading skeleton -->
            <div *ngIf="timelineLoading()" class="scrubber-skeleton" aria-live="polite">
              <div class="skeleton-row skeleton-score"></div>
              <div class="skeleton-grid">
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
              </div>
            </div>

            <!-- Snapshot content -->
            <ng-container *ngIf="!timelineLoading() && timelineSnapshot() as snap">
              <div class="scrubber-score" role="status" aria-live="polite">
                <span class="score-home">{{ snap.homeGoals }}</span>
                <span class="score-sep">-</span>
                <span class="score-away">{{ snap.awayGoals }}</span>
              </div>

              <div class="metric-grid">
                <div class="metric-card">
                  <span class="metric-label">Home xG</span>
                  <span class="metric-value">{{ snap.homeXg | number:'1.2-2' }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Away xG</span>
                  <span class="metric-value">{{ snap.awayXg | number:'1.2-2' }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Home Shots</span>
                  <span class="metric-value">{{ snap.homeShots }}</span>
                </div>
                <div class="metric-card">
                  <span class="metric-label">Away Shots</span>
                  <span class="metric-value">{{ snap.awayShots }}</span>
                </div>
              </div>
            </ng-container>

            <!-- Empty / error state -->
            <div *ngIf="!timelineLoading() && !timelineSnapshot() && !timelineError()" class="empty-snapshot">
              <p>Timeline not available for this match (feature off, or no V24 detail persisted).</p>
            </div>
            <div *ngIf="!timelineLoading() && timelineError()" class="error-snapshot" role="alert">
              <p>{{ timelineError() }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; padding: 1rem; max-width: 1400px; margin: 0 auto; }
    .test-harness-page { color: var(--text-color, #222); }
    .page-header { margin-bottom: 1.5rem; }
    .page-title { margin: 0; font-size: 1.5rem; }
    .page-subtitle { margin: 0.25rem 0 0; color: var(--text-muted, #666); font-size: 0.9rem; }
    .link-back { display: inline-block; margin-top: 0.5rem; font-size: 0.85rem; }
    .state-container { padding: 2rem; text-align: center; }
    .state-spinner {
      width: 32px; height: 32px; border: 3px solid #ccc; border-top-color: #1976d2;
      border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .test-harness-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "a b"
        "c c"
        "d d";
      gap: 1rem;
    }
    @media (max-width: 767px) {
      .test-harness-grid {
        grid-template-columns: 1fr;
        grid-template-areas: "a" "b" "c" "d";
      }
    }
    .panel { border: 1px solid var(--border-color, #e0e0e0); border-radius: 6px; padding: 1rem; background: var(--panel-bg, #fff); }
    .panel-a { grid-area: a; min-height: 320px; }
    .panel-b { grid-area: b; }
    .panel-c { grid-area: c; }
    .panel-d { grid-area: d; }
    .panel-title { margin: 0 0 0.5rem; font-size: 1rem; }
    .panel-hint { margin: 0 0 1rem; color: var(--text-muted, #666); font-size: 0.85rem; }
    .formation-field { width: 100%; }
    .seed-field, .round-field { width: 100%; }
    .control-group-divider {
      height: 1px;
      background: var(--border-color, #e0e0e0);
      margin: 1rem 0;
    }
    .button-stack { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
    .harness-warning {
      margin: 0.75rem 0 0;
      padding: 0.55rem 0.7rem;
      border-radius: 6px;
      background: #fff8e1;
      color: #795548;
      border: 1px solid #ffe0a3;
      font-size: 0.82rem;
      line-height: 1.35;
    }
    .formation-matrix {
      margin-top: 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
      background: #fafafa;
    }
    .matrix-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-start;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      color: var(--text-muted, #666);
      background: #f3f6f3;
    }
    .matrix-export {
      border: 1px solid #cfd8dc;
      border-radius: 999px;
      background: #fff;
      color: #2e5f3e;
      font-size: 0.72rem;
      padding: 0.18rem 0.55rem;
      cursor: pointer;
    }
    .matrix-table { display: grid; font-size: 0.8rem; }
    .matrix-row {
      display: grid;
      grid-template-columns: 72px 62px 92px 78px 78px minmax(128px, 1fr);
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-top: 1px solid #eee;
      font-variant-numeric: tabular-nums;
    }
    .matrix-row-head {
      font-weight: 700;
      color: var(--text-muted, #555);
      background: #fff;
    }
    .rounds-list { list-style: none; margin: 0; padding: 0; }
    .round-block { margin-bottom: 1rem; }
    .round-header { display: flex; gap: 0.5rem; align-items: baseline; margin-bottom: 0.5rem; }
    .round-label { font-weight: 600; }
    .round-bye { font-size: 0.8rem; color: var(--text-muted, #888); }
    .match-list { list-style: none; margin: 0; padding: 0; border: 1px solid #eee; border-radius: 4px; }
    .match-row {
      display: grid;
      grid-template-columns: 2fr 80px 100px;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      transition: background 0.1s;
    }
    .match-row:last-child { border-bottom: none; }
    .match-row:hover { background: #f8f8f8; }
    .match-row:focus { outline: 2px solid #1976d2; outline-offset: -2px; }
    .match-row-selected { background: #e3f2fd !important; }
    .match-teams { display: flex; gap: 0.5rem; }
    .team-sep { color: var(--text-muted, #888); }
    .match-score { text-align: center; font-variant-numeric: tabular-nums; }
    .match-status { text-align: right; font-size: 0.8rem; color: var(--text-muted, #666); }
    .empty-rounds { color: var(--text-muted, #666); font-size: 0.9rem; }
    .state-icon { font-weight: 700; font-size: 1.5rem; margin-bottom: 0.5rem; }
    .info-icon { color: #1976d2; }
    .error-icon { color: #d32f2f; }
    .error-text { color: #d32f2f; }

    /* === Panel D: timeline scrubber === */
    .scrubber-content { display: flex; flex-direction: column; gap: 0.75rem; }
    .scrubber-header { display: flex; align-items: baseline; gap: 0.5rem; }
    .minute-label { font-size: 1.1rem; font-weight: 600; }
    .match-context { font-size: 0.8rem; color: var(--text-muted, #888); }
    .minute-slider { width: 100%; cursor: pointer; }
    .minute-slider:disabled { cursor: not-allowed; opacity: 0.6; }
    .minute-ticks {
      display: flex; justify-content: space-between;
      font-size: 0.7rem; color: var(--text-muted, #888);
      font-variant-numeric: tabular-nums;
    }
    .tick { padding: 0 0.25rem; }
    .tick-active { color: #1976d2; font-weight: 600; }
    .scrubber-score {
      font-size: 2rem; font-weight: 700;
      display: flex; justify-content: center; gap: 0.5rem;
      font-variant-numeric: tabular-nums;
      margin: 0.5rem 0;
    }
    .score-home { color: #1565c0; }
    .score-away { color: #c62828; }
    .score-sep { color: var(--text-muted, #888); }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 0.5rem;
    }
    .metric-card {
      display: flex; flex-direction: column; align-items: center;
      padding: 0.5rem; border: 1px solid #eee; border-radius: 4px;
      background: #fafafa;
    }
    .metric-label { font-size: 0.75rem; color: var(--text-muted, #666); }
    .metric-value { font-size: 1.25rem; font-weight: 600; font-variant-numeric: tabular-nums; }
    .empty-snapshot { color: var(--text-muted, #666); font-size: 0.85rem; padding: 0.5rem 0; }
    .error-snapshot { color: #d32f2f; font-size: 0.85rem; padding: 0.5rem 0; }
    .scrubber-skeleton { display: flex; flex-direction: column; gap: 0.5rem; }
    .skeleton-row { background: #eee; height: 32px; border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; }
    .skeleton-card { background: #eee; height: 56px; border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `],
})
export class TestHarnessPageComponent implements OnInit, OnDestroy {
  private careerService = inject(CareerService);
  private matchDetailApi = inject(MatchDetailApiService);
  private harness = inject(TestHarnessService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private http = inject(HttpClient);

  /** Allowed formation codes (UI select options). */
  readonly formationCodes: readonly FormationCode[] = FORMATION_CODES;

  readonly teamStyleOptions: readonly TeamStyleOption[] = [
    { value: 'BALANCED', label: 'Balanceado', hint: 'Sin sesgo de canal.' },
    { value: 'WIDE_PLAY', label: 'Bandas', hint: 'Busca más ataques y remates por los costados.' },
    { value: 'CENTRAL_PLAY', label: 'Centro', hint: 'Concentra juego interior y remates centrales.' },
    { value: 'ATTACKING', label: 'Ofensivo', hint: 'Sube volumen general de chances.' },
    { value: 'DEFENSIVE', label: 'Defensivo', hint: 'Baja ritmo y prioriza protección.' },
    { value: 'COUNTER', label: 'Contra', hint: 'Menos posesión, más transición.' },
    { value: 'POSSESSION', label: 'Posesión', hint: 'Más posesión y elaboración.' },
  ];

  /** Constants exposed to the template. */
  readonly TIMELINE_MAX_MINUTE = TIMELINE_MAX_MINUTE;
  readonly TIMELINE_STEP = TIMELINE_STEP;

  /** Tick marks shown below the slider. */
  readonly minuteTicks: readonly number[] = (() => {
    const ticks: number[] = [];
    for (let m = 0; m <= TIMELINE_MAX_MINUTE; m += TIMELINE_STEP) {
      ticks.push(m);
    }
    return ticks;
  })();

  /** Selected formation (two-way bound to mat-select via ngModel). */
  selectedFormationModel: FormationCode | null = '4-3-3';

  selectedStyleModel: TeamStyle = 'BALANCED';

  /** V24D24.2: seed for the "Replay with seed" button (null = non-reproducible). */
  seedInputModel: number | null = DEFAULT_REPLAY_SEED;

  /** V24D24.2: round selected in the "Simulate round N" dropdown. */
  selectedRoundModel: number | null = null;

  // ============== State signals ==============

  /** The active careerId (resolved from CareerStatus; null if no career). */
  readonly careerId = signal<string | null>(null);

  readonly userTeamName = signal<string | null>(null);

  /** Currently selected match (Panel C click → Panel A renders). */
  readonly selectedMatchId = signal<string | null>(null);
  readonly detailPanelVisible = signal<boolean>(true);

  readonly selectedMatch = signal<TestHarnessMatchRow | null>(null);

  /** All matches of the active career, grouped by round. */
  readonly rounds = signal<RoundGroup[]>([]);

  /** True while we are loading the initial data (career + matches). */
  readonly loading = signal<boolean>(true);

  /** True while a mutation (set-formation, reset-injuries, replace-fixtures) is in flight. */
  readonly mutationInFlight = signal<boolean>(false);

  /** Error message from the initial load (null when OK). */
  readonly loadError = signal<string | null>(null);

  /** Formation comparison results for selected match + seed. */
  readonly formationReplayResults = signal<FormationReplayResult[]>([]);

  /** Controlled live tactical scenarios for selected match + seed. */
  readonly scenarioMatrixResults = signal<ScenarioMatrixRow[]>([]);

  /** True if there is an active career. */
  readonly hasCareer = computed(() => this.careerId() !== null);

  readonly selectedMatchIncludesUserTeam = computed(() => {
    const m = this.selectedMatch();
    const team = this.userTeamName();
    if (!m || !team) {
      return false;
    }
    return m.homeTeamName === team || m.awayTeamName === team;
  });

  // ============== Panel D state ==============

  /** Selected minute on the timeline scrubber (0-90 step 5). */
  readonly selectedMinute = signal<number>(0);

  /** Latest timeline snapshot (null when feature off or no detail). */
  readonly timelineSnapshot = signal<TimelineSnapshot | null>(null);

  /** True while fetching the timeline. */
  readonly timelineLoading = signal<boolean>(false);

  /** Error from the latest timeline fetch. */
  readonly timelineError = signal<string | null>(null);

  /** Active debounce timer for the timeline fetch. */
  private timelineFetchTimer: ReturnType<typeof setTimeout> | null = null;

  /** Monotonic counter for stale-response rejection. */
  private timelineFetchSeq = 0;

  // ============== Constructor / effects ==============

  constructor() {
    // V24D24 F3: re-fetch the timeline snapshot whenever the selected
    // match or the selected minute changes. Debounced 150ms so a fast
    // slider drag doesn't fire 18 requests.
    effect(() => {
      const matchId = this.selectedMatchId();
      const minute = this.selectedMinute();
      const careerId = this.careerId();

      if (this.timelineFetchTimer) {
        clearTimeout(this.timelineFetchTimer);
        this.timelineFetchTimer = null;
      }

      if (!matchId || !careerId) {
        this.timelineSnapshot.set(null);
        this.timelineError.set(null);
        this.timelineLoading.set(false);
        return;
      }

      this.timelineLoading.set(true);
      this.timelineError.set(null);
      const fetchId = ++this.timelineFetchSeq;

      this.timelineFetchTimer = setTimeout(() => {
        this.matchDetailApi.getMatchTimeline(careerId, matchId, minute).subscribe({
          next: (snap) => {
            if (fetchId !== this.timelineFetchSeq) {
              return; // stale response
            }
            this.timelineSnapshot.set(snap);
            this.timelineLoading.set(false);
          },
          error: (err) => {
            if (fetchId !== this.timelineFetchSeq) {
              return;
            }
            this.timelineError.set(
              this.fmtError(err, 'Failed to load timeline snapshot')
            );
            this.timelineSnapshot.set(null);
            this.timelineLoading.set(false);
          },
        });
      }, TIMELINE_DEBOUNCE_MS);
    });
  }

  // ============== Lifecycle ==============

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    if (this.timelineFetchTimer) {
      clearTimeout(this.timelineFetchTimer);
      this.timelineFetchTimer = null;
    }
  }

  /** Re-load the career status and the match list. */
  reload(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.careerService.getCareerStatus().subscribe({
      next: (status) => {
        if (!status.careerId) {
          this.careerId.set(null);
          this.userTeamName.set(null);
          this.selectedMatch.set(null);
          this.rounds.set([]);
          this.loading.set(false);
          return;
        }
        this.careerId.set(status.careerId);
        this.userTeamName.set(status.userTeamName ?? null);
        this.loadMatches();
      },
      error: (err) => {
        this.loadError.set(
          err?.error?.message ?? err?.message ?? 'Failed to load career status.'
        );
        this.loading.set(false);
      },
    });
  }

  /** Set the selected match (Panel C → Panel A re-render via @Input). */
  selectMatch(m: TestHarnessMatchRow): void {
    this.selectedMatchId.set(m.matchId);
    this.selectedMatch.set(m);
    // Reset the scrubber to the start of the match when switching matches.
    this.selectedMinute.set(0);
  }

  /**
   * Panel D slider handler. Called on every `input` event from the
   * <input type="range">. The effect in the constructor debounces the
   * actual HTTP call.
   */
  onSliderInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);
    if (Number.isFinite(value) && value >= 0 && value <= TIMELINE_MAX_MINUTE) {
      this.selectedMinute.set(value);
    }
  }

  // ============== Panel B handlers ==============

  /** Two-way binding shim for mat-select. */
  onFormationChange(value: string): void {
    this.selectedFormationModel = (value as FormationCode) ?? null;
  }

  applyFormation(): void {
    const formation = this.selectedFormationModel;
    if (!formation) {
      this.snackBar.open('Pick a formation first.', 'OK', { duration: 3000 });
      return;
    }
    this.mutationInFlight.set(true);
    this.harness.setFormation(formation).subscribe({
      next: (resp) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          resp?.message ?? `Formation ${formation} applied.`,
          'OK',
          { duration: 3000 }
        );
        this.refreshDetailAfterMutation();
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to set formation'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }

  onResetInjuries(): void {
    this.mutationInFlight.set(true);
    this.harness.resetInjuries().subscribe({
      next: (resp) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          resp?.message ?? 'Injuries reset.',
          'OK',
          { duration: 3000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to reset injuries'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }

  onReplaceFixtures(): void {
    // V24D24 F2: For now the UI only triggers a no-op POST (the backend
    // expects a real CustomFixture[]). The full "Barcelona rival" preset
    // builder is out of F2 scope. Until then, we send an empty array.
    const preset = this.buildSingleMatchPreset();
    this.mutationInFlight.set(true);
    this.harness.replaceFixtures(preset).subscribe({
      next: (resp) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          resp?.message ?? 'Fixtures replaced.',
          'OK',
          { duration: 3000 }
        );
        // Match list will change — reload.
        this.loadMatches();
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to replace fixtures'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }

  fmtXg(value: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return 'â€”';
    }
    return value.toFixed(2);
  }

  copyFormationMatrixJson(): void {
    const payload = JSON.stringify(this.formationReplayResults(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Formation matrix JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }

  copyScenarioMatrixJson(): void {
    const payload = JSON.stringify(this.scenarioMatrixResults(), null, 2);
    navigator.clipboard?.writeText(payload).then(
      () => this.snackBar.open('Scenario matrix JSON copied.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(payload, 'OK', { duration: 5000 })
    );
  }

  downloadFormationMatrixCsv(): void {
    const rows = this.formationReplayResults();
    const header = [
      'formation', 'homeGoals', 'awayGoals', 'homePossession', 'awayPossession',
      'homeShots', 'awayShots', 'homeXg', 'awayXg',
      'homeCentralShots', 'homeWideShots', 'homeLongShots',
      'awayCentralShots', 'awayWideShots', 'awayLongShots',
    ];
    const lines = [
      header.join(','),
      ...rows.map((r) => header.map((key) => this.csvCell((r as unknown as Record<string, unknown>)[key])).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formation-matrix-${this.seedInputModel ?? 'auto'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private csvCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private buildFormationReplayResult(
    formation: FormationCode,
    fixture: MatchFixture,
    detail: MatchDetail | null
  ): FormationReplayResult {
    const zoneSummary = this.summarizeShotZones(detail);
    return {
      formation,
      homeGoals: fixture?.result?.homeGoals ?? null,
      awayGoals: fixture?.result?.awayGoals ?? null,
      homePossession: fixture?.result?.homePossession ?? null,
      awayPossession: fixture?.result?.awayPossession ?? null,
      homeShots: fixture?.result?.homeShots ?? null,
      awayShots: fixture?.result?.awayShots ?? null,
      homeXg: detail?.homeXg ?? null,
      awayXg: detail?.awayXg ?? null,
      homeCentralShots: zoneSummary.home.central,
      homeWideShots: zoneSummary.home.wide,
      homeLongShots: zoneSummary.home.long,
      awayCentralShots: zoneSummary.away.central,
      awayWideShots: zoneSummary.away.wide,
      awayLongShots: zoneSummary.away.long,
    };
  }

  private summarizeShotZones(detail: MatchDetail | null): {
    home: { central: number; wide: number; long: number };
    away: { central: number; wide: number; long: number };
  } {
    const summary = {
      home: { central: 0, wide: 0, long: 0 },
      away: { central: 0, wide: 0, long: 0 },
    };
    if (!detail) return summary;
    for (const event of detail.timeline ?? []) {
      if (!this.isShotLikeEvent(event)) continue;
      const bucket = event.teamId === detail.homeTeamId ? summary.home : summary.away;
      const location = event.shotCoordinate?.location;
      if (location === 'PENALTY_AREA_WIDE') {
        bucket.wide++;
      } else if (location === 'OUTSIDE_BOX' || location === 'LONG_RANGE') {
        bucket.long++;
      } else {
        bucket.central++;
      }
    }
    return summary;
  }

  private isShotLikeEvent(event: MatchEvent): boolean {
    return (
        event.type === 'SHOT'
        || event.type === 'SHOT_ON_TARGET'
        || event.type === 'MISS'
        || event.type === 'BLOCK'
        || event.type === 'GOAL'
      )
      && event.xg !== null
      && event.xg !== undefined
      && event.xg > 0;
  }

  /**
   * Opens the same visual editor used by /squad, directly from the replay lab.
   *
   * This is intentionally not a second implementation: player swaps, bench
   * moves, free pixel positioning, customX/customY persistence, tactical
   * chemistry preview and manual-select save all stay inside the production
   * SquadEditorModalComponent. The harness only provides the current career
   * context and refreshes after the modal closes.
   */
  openSquadEditor(): void {
    const careerId = this.careerId();
    if (!careerId) {
      this.snackBar.open('No active career loaded.', 'OK', { duration: 3000 });
      return;
    }

    this.mutationInFlight.set(true);
    forkJoin({
      squad: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/players/squad`).pipe(
        catchError(() => of([] as SessionPlayer[]))
      ),
      lineup: this.http.get<{ formation?: string | null }>(`${environment.apiUrl}/career/lineup/current`).pipe(
        catchError(() => of({ formation: this.selectedFormationModel }))
      ),
    }).subscribe({
      next: ({ squad, lineup }) => {
        this.mutationInFlight.set(false);
        const currentFormation =
          lineup?.formation ?? this.selectedFormationModel ?? '4-4-2';

        const ref = this.dialog.open(SquadEditorModalComponent, {
          data: {
            careerId,
            matchId: null,
            squad,
            currentFormation,
          },
          width: '98vw',
          height: '90vh',
          disableClose: false,
          panelClass: 'squad-editor-panel',
        });

        ref.afterClosed().subscribe(() => {
          this.refreshLineupContext();
          this.loadMatches();
          this.refreshDetailAfterMutation();
        });
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to open squad editor'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }

  // ============== V24D24.2: Replay-with-seed + Simulate-round handlers ==============

  /**
   * Two-way binding shim for the seed number input. Empty / NaN input
   * → null (non-reproducible replay). Otherwise coerce to a number.
   */
  onSeedChange(value: unknown): void {
    if (value === null || value === undefined || value === '') {
      this.seedInputModel = null;
      return;
    }
    const n = typeof value === 'number' ? value : Number(value);
    this.seedInputModel = Number.isFinite(n) ? n : null;
  }

  /** Two-way binding shim for the round mat-select. */
  onRoundSelect(value: unknown): void {
    this.selectedRoundModel = typeof value === 'number' ? value : null;
  }

  /**
   * V24D24.2: replay the currently-selected match (Panel C click → selected
   * match) with the seed typed in Panel B. Refresca Panel A + D via
   * {@link refreshDetailAfterMutation}.
   *
   * <p>Respects the existing {@code mutationInFlight} contract: the button
   * is disabled while any other mutation is in flight, and we set the flag
   * here so all sibling buttons disable while we wait.
   */
  onReplayWithSeed(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    this.mutationInFlight.set(true);
    this.harness.setStyle(this.selectedStyleModel).pipe(
      switchMap(() => this.harness.replayMatch(matchId, this.seedInputModel))
    ).subscribe({
      next: (fixture) => {
        this.mutationInFlight.set(false);
        const seedDesc =
          this.seedInputModel !== null
            ? `seed=${this.seedInputModel}`
            : 'non-reproducible seed';
        const score =
          fixture?.result != null
            ? ` → ${fixture.result.homeGoals}-${fixture.result.awayGoals}`
            : '';
        this.snackBar.open(
          `Match replayed (${seedDesc}, ${this.selectedStyleLabel()})${score}.`,
          'OK',
          { duration: 3000 }
        );
        // The match list will update too — reload so Panel C reflects the
        // new score, then refresh Panel A + D (existing pattern).
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to replay match'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }

  /**
   * V24D24.2: simulate the selected round (Panel B dropdown). Extracts the
   * matches of that round from {@code rounds()}, builds the request body,
   * and POSTs to {@code /api/v1/match-engine/rounds/start}.
   *
   * <p>The backend runs the simulation async — we get back the initial
   * RoundStateResponse and let Iván watch the scores land by reloading
   * Panel C (the round will eventually mark matches COMPLETED).
   */
  onSimulateRound(): void {
    const roundNumber = this.selectedRoundModel;
    if (roundNumber === null) {
      this.snackBar.open('Pick a round in the dropdown first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    const roundGroup = this.rounds().find((r) => r.round === roundNumber);
    if (!roundGroup || roundGroup.matches.length === 0) {
      this.snackBar.open(
        `Round ${roundNumber} has no matches to simulate.`,
        'OK',
        { duration: 3000 }
      );
      return;
    }
    // Pick the roundId from the first match — all matches of the round
    // share the same deterministic UUID (F1 backend contract).
    const roundId = roundGroup.matches[0]?.roundId ?? null;
    if (!roundId) {
      this.snackBar.open(
        `Round ${roundNumber} has no roundId (backend did not hydrate it). Reload the page.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const matchesPayload = roundGroup.matches.map((m) => ({
      matchId: m.matchId,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
    }));

    this.mutationInFlight.set(true);
    this.harness.simulateRound(roundId, matchesPayload).subscribe({
      next: () => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          `Round ${roundNumber} simulation started (${matchesPayload.length} matches).`,
          'OK',
          { duration: 3000 }
        );
        // The simulation is async — reload the match list once so the UI
        // catches up on whatever completed by the time the response lands.
        // Iván can re-click Simulate or Replay later for further updates.
        this.loadMatches();
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, `Failed to simulate round ${roundNumber}`),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }

  // ============== Track-by ==============

  trackByRound(_index: number, r: RoundGroup): number {
    return r.round;
  }

  trackByMatchId(_index: number, m: TestHarnessMatchRow): string {
    return m.matchId;
  }

  trackByFormationReplay(_index: number, row: FormationReplayResult): string {
    return row.formation;
  }

  trackByScenarioMatrix(_index: number, row: ScenarioMatrixRow): string {
    return row.scenario;
  }

  selectedStyleLabel(): string {
    return this.teamStyleOptions.find((o) => o.value === this.selectedStyleModel)?.label ?? this.selectedStyleModel;
  }

  selectedStyleHint(): string {
    return this.teamStyleOptions.find((o) => o.value === this.selectedStyleModel)?.hint ?? '';
  }

  styleShort(style: TeamStyle | null): string {
    if (!style) {
      return '-';
    }
    return this.teamStyleOptions.find((o) => o.value === style)?.label ?? style;
  }

  actionLabel(row: ScenarioMatrixRow): string {
    if (row.actionType === 'STYLE') {
      return this.styleShort(row.changedStyle);
    }
    if (row.actionType === 'FORMATION') {
      return row.actionDetail || 'Formation';
    }
    if (row.actionType === 'SUBSTITUTION') {
      return row.actionDetail || 'Substitution';
    }
    return 'Base';
  }

  fmtPct(value: number | null): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '—';
    }
    return `${Math.round(value)}%`;
  }

  /**
   * Replay-lab shortcut: run the selected match once per formation with the
   * same seed, then render the score/possession/shot table in Panel B.
   *
   * The calls run sequentially through the existing set-formation + replay
   * endpoints so the engine sees exactly the formation being measured.
   */
  onRunFormationMatrix(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open(
        `Pick a match involving ${this.userTeamName() || 'your team'} before running the formation matrix.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }
    const careerId = this.careerId();
    if (!careerId) {
      this.snackBar.open('Active career id is not available.', 'OK', {
        duration: 3000,
      });
      return;
    }

    const seed = this.seedInputModel;
    this.formationReplayResults.set([]);
    this.mutationInFlight.set(true);

    this.harness.getCurrentLineup().pipe(
      switchMap((originalLineup) => {
        const originalFormation =
          originalLineup?.formation || this.selectedFormationModel || null;
        const originalPlayerIds =
          originalLineup?.players?.map((p) => p.playerId).filter(Boolean) ?? [];
        const originalSlots = originalLineup?.slots ?? [];

        if (originalPlayerIds.length !== 11) {
          throw new Error(
            `Formation matrix needs exactly 11 current lineup players, got ${originalPlayerIds.length}.`
          );
        }

        return this.harness.setStyle(this.selectedStyleModel).pipe(
          switchMap(() => from(this.formationCodes)),
      concatMap((formation) =>
        this.harness.manualSelectLineup(formation, originalPlayerIds).pipe(
          switchMap(() => this.harness.replayMatch(matchId, seed)),
          switchMap((fixture) =>
            this.matchDetailApi.getMatchDetail(careerId, matchId).pipe(
              catchError(() => of(null)),
              map((detail) => this.buildFormationReplayResult(formation, fixture, detail))
            )
          )
        )
      ),
          switchMap((row) => {
            this.formationReplayResults.update((rows) => [...rows, row]);
            return of(row);
          }),
          // Restore the exact original lineup after the last measured formation.
          // The restore is part of the observable chain so `complete` only fires
          // after the user squad is back where it started.
          switchMap((row, index) => {
            const isLast = index === this.formationCodes.length - 1;
            if (!isLast || !originalFormation) {
              return of(row);
            }
            return this.harness.manualSelectLineup(
              originalFormation,
              originalPlayerIds,
              originalSlots
            ).pipe(map(() => row));
          })
        );
      })
    ).subscribe({
      next: (row) => {
        // Rows are appended inside the chain so they appear progressively before
        // the restore request runs. Keep next side-effect free.
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to run formation matrix'),
          'OK',
          { duration: 5000 }
        );
      },
      complete: () => {
        this.mutationInFlight.set(false);
        this.refreshLineupContext();
        this.snackBar.open(
          `Formation matrix completed (${this.formationReplayResults().length} formations).`,
          'OK',
          { duration: 3000 }
        );
        this.loadMatches();
        this.refreshDetailAfterMutation();
        this.refreshDetailAfterMutation(1200);
      },
    });
  }

  onRunScenarioMatrix(): void {
    const matchId = this.selectedMatchId();
    if (!matchId) {
      this.snackBar.open('Select a match in Panel C first.', 'OK', {
        duration: 3000,
      });
      return;
    }
    if (!this.selectedMatchIncludesUserTeam()) {
      this.snackBar.open(
        `Pick a match involving ${this.userTeamName() || 'your team'} before running the scenario matrix.`,
        'OK',
        { duration: 5000 }
      );
      return;
    }

    this.scenarioMatrixResults.set([]);
    this.mutationInFlight.set(true);
    this.harness.runScenarioMatrix(matchId, this.seedInputModel).subscribe({
      next: (rows) => {
        this.scenarioMatrixResults.set(rows ?? []);
        this.mutationInFlight.set(false);
        this.snackBar.open(
          `Scenario matrix completed (${rows?.length ?? 0} scenarios).`,
          'OK',
          { duration: 3000 }
        );
      },
      error: (err) => {
        this.mutationInFlight.set(false);
        this.snackBar.open(
          this.fmtError(err, 'Failed to run scenario matrix'),
          'OK',
          { duration: 5000 }
        );
      },
    });
  }

  // ============== Internal helpers ==============

  private loadMatches(): void {
    this.careerService.getAllFixturesWithBye().subscribe({
      next: (resp) => {
        const rounds: RoundGroup[] = (resp?.rounds ?? []).map((rd) => ({
          round: rd.round,
          byeTeam: rd.byeTeam ?? null,
          matches: (rd.matches ?? []).map((f: Fixture) =>
            this.fixtureToMatchRow(f)
          ),
        }));
        this.rounds.set(rounds);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(
          this.fmtError(err, 'Failed to load match list')
        );
        this.loading.set(false);
      },
    });
  }

  /**
   * Build a TestHarnessMatchRow from a CareerService Fixture.
   *
   * <p>Team display names: the backend {@code GET /career/fixtures/
   * round-with-bye} endpoint (the one this UI calls via
   * {@code getAllFixturesWithBye}) hydrates {@code homeTeamName} and
   * {@code awayTeamName} on each fixture via the
   * {@code FixtureQueryDtos.MatchInfo} record. V24D24.2-F2.5 surfaces
   * those names in Panel C instead of falling back to the teamId.
   *
   * <p>Defensive fallback: if the backend ever returns a fixture
   * without the names hydrated (legacy endpoint, race condition on a
   * freshly created career), we still render the teamId so the row is
   * not blank.
   *
   * <p>V24D24.2: also carries through {@code roundId} so the dropdown /
   * Simulate button can POST it directly to
   * {@code /api/v1/match-engine/rounds/start}.
   */
  private fixtureToMatchRow(f: Fixture): TestHarnessMatchRow {
    return {
      matchId: f.matchId,
      round: f.round,
      homeTeamId: f.homeTeamId,
      homeTeamName: f.homeTeamName ?? f.homeTeamId,
      awayTeamId: f.awayTeamId,
      awayTeamName: f.awayTeamName ?? f.awayTeamId,
      status: f.status,
      homeGoals: f.homeGoals ?? null,
      awayGoals: f.awayGoals ?? null,
      homeFormation: null,
      awayFormation: null,
      roundId: f.roundId ?? null,
    };
  }

  /**
   * V24D24 F2: tiny preset (empty array) so the "Replace Fixtures"
   * button has something to send without requiring a UI builder.
   */
  private buildSingleMatchPreset() {
    return [];
  }

  /**
   * Force Panel A to re-fetch without clearing the global selected match.
   *
   * Previous implementation temporarily set selectedMatchId(null) and then
   * restored it on the next microtask. That remounted Panel A, but it also made
   * Panel B/D briefly believe no match was selected. During long replay flows
   * like Formation matrix, that transient null could collapse controls and make
   * the matrix table disappear or leave buttons disabled. Keep selectedMatchId
   * stable and toggle only the detail panel visibility.
   */
  private refreshDetailAfterMutation(delayMs = 0): void {
    const current = this.selectedMatchId();
    if (current) {
      const remount = () => {
        this.detailPanelVisible.set(false);
        Promise.resolve().then(() => this.detailPanelVisible.set(true));
      };
      if (delayMs > 0) {
        setTimeout(remount, delayMs);
      } else {
        remount();
      }
    }
  }

  private refreshLineupContext(): void {
    this.http.get<{ formation?: string | null }>(`${environment.apiUrl}/career/lineup/current`)
      .pipe(catchError(() => of(null)))
      .subscribe((lineup) => {
        const formation = lineup?.formation;
        if (formation && this.formationCodes.includes(formation as FormationCode)) {
          this.selectedFormationModel = formation as FormationCode;
        }
      });
  }

  private fmtError(err: any, fallback: string): string {
    return err?.error?.message ?? err?.message ?? fallback;
  }
}
