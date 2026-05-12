import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatchDetailApiService } from '../services/match-detail-api.service';
import { MatchDetail } from '../models/match-detail.model';

/**
 * V24D5E4: Add Player Ratings UI
 *
 * Shows per-player ratings when playerRatings is non-empty.
 * Empty state for old matches or missing data.
 * Sorted by rating descending, top-rated player highlighted.
 * Grouped by team (home first, then away).
 *
 * No mutations. No career-state changes.
 */
@Component({
  selector: 'app-v24-match-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="v24-match-detail-page">

      <!-- Loading state -->
      <div *ngIf="loading" class="state-container">
        <div class="state-spinner"></div>
        <p class="loading-text">Loading match detail...</p>
      </div>

      <!-- Error state -->
      <div *ngIf="!loading && error" class="state-container">
        <div class="state-icon error-icon">!</div>
        <p class="error-text">Failed to load match detail.</p>
        <button (click)="retry()" class="btn btn-primary">Retry</button>
        <a routerLink="/matches" class="link">Back to matches</a>
      </div>

      <!-- Detail unavailable state (404 / null) -->
      <div *ngIf="!loading && !error && detail === null" class="state-container">
        <div class="state-icon info-icon">?</div>
        <h2 class="state-title">Match Detail</h2>
        <p class="unavailable-text">Detailed match data is not available for this match.</p>
        <div class="info-box">
          <p class="info-box-title">Possible reasons:</p>
          <ul class="info-list">
            <li>Match was played before V24 detail persistence was enabled</li>
            <li>Detail persistence was disabled during simulation</li>
            <li>Endpoint is currently disabled</li>
          </ul>
        </div>
        <a routerLink="/matches" class="link">Back to matches</a>
      </div>

      <!-- Detail success state -->
      <div *ngIf="!loading && !error && detail !== null" class="detail-content">

        <!-- Header -->
        <div class="match-header">
          <a routerLink="/matches" class="link link-back">&#8592; Back to matches</a>
          <div class="scoreboard">
            <div class="team home-team">
              <span class="team-name">{{ detail.homeTeamName }}</span>
            </div>
            <div class="score-container">
              <span class="score">{{ detail.homeGoals }}</span>
              <span class="score-sep">–</span>
              <span class="score">{{ detail.awayGoals }}</span>
            </div>
            <div class="team away-team">
              <span class="team-name">{{ detail.awayTeamName }}</span>
            </div>
          </div>
          <div class="match-meta">
            <span class="meta-item">Round {{ detail.round }}</span>
            <span class="meta-dot">·</span>
            <span class="meta-item">Season {{ detail.seasonNumber }}</span>
            <span class="meta-dot">·</span>
            <span class="badge badge-v24">V24 Engine</span>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="stat-card">
            <span class="stat-card-label">xG</span>
            <div class="stat-card-values">
              <span class="stat-home">{{ detail.homeXg.toFixed(2) }}</span>
              <span class="stat-divider">–</span>
              <span class="stat-away">{{ detail.awayXg.toFixed(2) }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-card-label">Shots</span>
            <div class="stat-card-values">
              <span class="stat-home">{{ detail.homeShots }}</span>
              <span class="stat-divider">–</span>
              <span class="stat-away">{{ detail.awayShots }}</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-card-label">Possession</span>
            <div class="stat-card-values">
              <span class="stat-home">{{ detail.homePossession }}%</span>
              <span class="stat-divider">–</span>
              <span class="stat-away">{{ detail.awayPossession }}%</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-card-label">Goals</span>
            <div class="stat-card-values">
              <span class="stat-home">{{ detail.homeGoals }}</span>
              <span class="stat-divider">–</span>
              <span class="stat-away">{{ detail.awayGoals }}</span>
            </div>
          </div>
        </div>

        <!-- Timeline Section -->
        <div class="section">
          <h3 class="section-title">Timeline</h3>
          <div *ngIf="detail.timeline.length === 0" class="empty-state">
            No timeline events available.
          </div>
          <ul class="timeline-list" *ngIf="detail.timeline.length > 0">
            <li *ngFor="let event of detail.timeline" class="timeline-item">
              <span class="event-minute">{{ event.minute }}'</span>
              <span class="event-badge" [ngClass]="eventClass(event.type)">{{ event.type }}</span>
              <div class="event-body">
                <span class="event-player">{{ event.playerName }}</span>
                <span class="event-assist" *ngIf="event.relatedPlayerName">assist: {{ event.relatedPlayerName }}</span>
              </div>
              <div class="event-meta">
                <span class="event-xg" *ngIf="event.xg != null">xG {{ event.xg.toFixed(2) }}</span>
                <span class="event-desc">{{ event.description }}</span>
              </div>
            </li>
          </ul>
        </div>

        <!-- Stats Comparison Section -->
        <div class="section">
          <h3 class="section-title">Stats</h3>
          <div class="stats-table">
            <div class="stats-row" *ngFor="let row of statsComparison()">
              <span class="stat-label">{{ row.label }}</span>
              <span class="stat-home">{{ row.home }}</span>
              <span class="stat-away">{{ row.away }}</span>
            </div>
          </div>
        </div>

        <!-- Players Section -->
        <div class="section">
          <h3 class="section-title">Players</h3>
          <div *ngIf="!hasPlayerRatings()" class="empty-state">
            Player ratings are not available for this match.
          </div>
          <div *ngIf="hasPlayerRatings()" class="players-container">
            <div class="team-players" *ngFor="let team of playerRatingsByTeam()">
              <div class="team-header">
                <span class="team-label">{{ team.label }}</span>
                <span class="team-rating" *ngIf="team.topPlayer">Top: {{ team.topPlayer.playerName }} ({{ team.topPlayer.rating.toFixed(1) }})</span>
              </div>
              <div class="table-responsive">
                <table class="players-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Pos</th>
                      <th>Rat</th>
                      <th>G</th>
                      <th>A</th>
                      <th>KP</th>
                      <th>Sh</th>
                      <th>Cards</th>
                      <th>Inj</th>
                      <th>Subs</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of team.players; let i = index"
                        [class.row-top]="i === 0">
                      <td class="player-name">{{ p.playerName }}</td>
                      <td class="player-pos">{{ p.position }}</td>
                      <td class="player-rating" [class.rat-high]="p.rating >= 7.0" [class.rat-low]="p.rating < 6.0">{{ p.rating.toFixed(1) }}</td>
                      <td>{{ p.goals }}</td>
                      <td>{{ p.assists }}</td>
                      <td>{{ p.keyPasses }}</td>
                      <td>{{ p.shots }}</td>
                      <td class="text-center">
                        <span *ngIf="p.cards > 0" class="badge-card" [class.yellow]="p.cards === 1" [class.red]="p.cards >= 2">{{ p.cards }}</span>
                        <span *ngIf="p.cards === 0" class="text-muted">–</span>
                      </td>
                      <td class="text-center">
                        <span *ngIf="p.injuries > 0" class="badge-inj">{{ p.injuries }}</span>
                        <span *ngIf="p.injuries === 0" class="text-muted">–</span>
                      </td>
                      <td class="text-center">
                        <span *ngIf="p.substitutions > 0">{{ p.substitutions }}</span>
                        <span *ngIf="p.substitutions === 0" class="text-muted">–</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Shots Section (Shot Map) -->
        <div class="section">
          <h3 class="section-title">Shot Map</h3>
          <div *ngIf="!hasShotMap()" class="empty-state">
            Shot map is not available for this match.
          </div>
          <div *ngIf="hasShotMap()" class="shot-map-container">
            <div class="shot-map-header">
              <span>{{ shotMapEvents().length }} shots</span>
              <span class="meta-dot">·</span>
              <span>{{ shotGoalsCount() }} goals</span>
              <span class="meta-dot" *ngIf="averageShotXg() !== null">·</span>
              <span *ngIf="averageShotXg() !== null">Avg xG {{ averageShotXg()!.toFixed(2) }}</span>
            </div>
            <div class="pitch-wrap">
              <div class="pitch" role="img" aria-label="Shot map">
                <div class="pitch-line center-line"></div>
                <div class="pitch-rect penalty-area"></div>
                <div class="pitch-rect six-yard"></div>
                <div *ngFor="let event of shotMapEvents()" class="shot-dot"
                  [class.dot-goal]="isGoalEvent(event)"
                  [style.left.%]="clamp(event.shotCoordinate!.x)"
                  [style.top.%]="clamp(event.shotCoordinate!.y)"
                  [title]="formatTooltip(event)"
                  [attr.aria-label]="formatTooltip(event)">
                </div>
              </div>
            </div>
            <div class="shot-legend">
              <span class="legend-item"><span class="legend-dot dot-goal"></span> Goal</span>
              <span class="legend-item"><span class="legend-dot dot-other"></span> Shot / Block / Miss</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    /* === Layout === */
    .v24-match-detail-page {
      padding: 16px;
      max-width: 900px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1a1a2e;
      background: #fafbfc;
    }
    .detail-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* === State containers === */
    .state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      gap: 12px;
    }
    .state-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e0e0e0;
      border-top-color: #1976d2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .state-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: bold;
    }
    .state-icon.error-icon { background: #ffebee; color: #c62828; }
    .state-icon.info-icon { background: #e3f2fd; color: #1976d2; }
    .state-title { margin: 0; font-size: 20px; color: #333; }
    .loading-text { color: #666; font-size: 15px; margin: 0; }
    .error-text { color: #c62828; font-size: 15px; margin: 0; }
    .unavailable-text { color: #555; font-size: 15px; margin: 0; }

    /* === Buttons & Links === */
    .btn {
      padding: 8px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-primary { background: #1976d2; color: #fff; }
    .link {
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
    }
    .link:hover { text-decoration: underline; }
    .link-back {
      font-size: 13px;
      display: inline-block;
      margin-bottom: 8px;
    }

    /* === Info box === */
    .info-box {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 12px 16px;
      max-width: 400px;
      width: 100%;
      text-align: left;
    }
    .info-box-title { font-size: 13px; color: #555; margin: 0 0 6px; }
    .info-list {
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
      color: #777;
    }
    .info-list li { margin-bottom: 4px; }

    /* === Header / Scoreboard === */
    .match-header {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .scoreboard {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }
    .team { flex: 1; }
    .team-name {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      display: block;
    }
    .away-team .team-name { text-align: right; }
    .score-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .score {
      font-size: 36px;
      font-weight: 700;
      color: #1976d2;
      line-height: 1;
    }
    .score-sep { font-size: 24px; color: #aaa; font-weight: 300; }
    .match-meta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: #888;
    }
    .meta-item { }
    .meta-dot { color: #ccc; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-v24 { background: #e3f2fd; color: #1976d2; }

    /* === Summary Cards === */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .stat-card {
      background: #fff;
      border-radius: 10px;
      padding: 14px 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.07);
      display: flex;
      flex-direction: column;
      gap: 6px;
      text-align: center;
    }
    .stat-card-label {
      font-size: 11px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card-values {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .stat-home { font-size: 16px; font-weight: 700; color: #1a1a2e; }
    .stat-away { font-size: 16px; font-weight: 700; color: #1a1a2e; }
    .stat-divider { font-size: 13px; color: #bbb; }

    /* === Sections === */
    .section {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0 0 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }

    /* === Empty state === */
    .empty-state {
      color: #aaa;
      font-size: 14px;
      font-style: italic;
      padding: 8px 0;
    }

    /* === Timeline === */
    .timeline-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;
      font-size: 13px;
    }
    .timeline-item:last-child { border-bottom: none; }
    .event-minute {
      font-weight: 700;
      color: #1976d2;
      min-width: 28px;
      font-size: 13px;
      padding-top: 1px;
    }
    .event-badge {
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
    .event-body {
      flex: 1;
      min-width: 0;
    }
    .event-player {
      font-weight: 600;
      color: #1a1a2e;
      display: block;
    }
    .event-assist {
      font-size: 11px;
      color: #999;
      display: block;
    }
    .event-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .event-xg { font-size: 11px; color: #888; }
    .event-desc { font-size: 11px; color: #bbb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

    /* Event type badge colors */
    .event-goal    { background: #e8f5e9; color: #2e7d32; }
    .event-shot    { background: #fff3e0; color: #e65100; }
    .event-foul    { background: #ffebee; color: #c62828; }
    .event-yellow_card { background: #fff9c4; color: #f9a825; }
    .event-red_card { background: #ffcdd2; color: #c62828; }
    .event-injury  { background: #e3f2fd; color: #0288d1; }
    .event-substitution { background: #f3e5f5; color: #7b1fa2; }
    .event-offside { background: #fafafa; color: #757575; }
    .event-corner  { background: #e0f7fa; color: #00838f; }
    .event-chance_created { background: #fafafa; color: #757575; }
    .event-shot_on_target { background: #fff3e0; color: #e65100; }
    .event-block { background: #fff3e0; color: #e65100; }
    .event-miss { background: #f5f5f5; color: #757575; }

    /* === Stats Comparison === */
    .stats-table {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .stats-row {
      display: grid;
      grid-template-columns: 80px 1fr 1fr;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;
    }
    .stats-row:last-child { border-bottom: none; }
    .stat-label { font-size: 13px; color: #666; text-transform: uppercase; font-size: 11px; letter-spacing: 0.3px; }
    .stats-row .stat-home { text-align: right; font-weight: 700; font-size: 15px; color: #1a1a2e; }
    .stats-row .stat-away { text-align: left; font-weight: 700; font-size: 15px; color: #1a1a2e; }

    /* === Players === */
    .players-container { display: flex; flex-direction: column; gap: 20px; }
    .team-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .team-label {
      font-size: 12px;
      font-weight: 700;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .team-rating {
      font-size: 12px;
      color: #2e7d32;
      font-weight: 600;
    }
    .table-responsive { overflow-x: auto; }
    .players-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      min-width: 560px;
    }
    .players-table th {
      text-align: left;
      padding: 7px 8px;
      background: #f5f5f5;
      color: #777;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border-bottom: 2px solid #e0e0e0;
      white-space: nowrap;
    }
    .players-table td {
      padding: 7px 8px;
      border-bottom: 1px solid #f5f5f5;
      color: #1a1a2e;
      white-space: nowrap;
    }
    .players-table tr:last-child td { border-bottom: none; }
    .players-table tr.row-top td { background: #f8fff8; }
    .players-table tr:hover td { background: #fafafa; }
    .player-name { font-weight: 600; }
    .player-pos { color: #888; font-size: 12px; }
    .player-rating { font-weight: 700; }
    .rat-high { color: #1565c0; }
    .rat-low { color: #c62828; }
    .text-center { text-align: center; }
    .text-muted { color: #ccc; }
    .badge-card {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-card.yellow { background: #fff9c4; color: #f9a825; }
    .badge-card.red { background: #ffcdd2; color: #c62828; }
    .badge-inj { color: #0288d1; font-weight: 700; font-size: 12px; }

    /* === Shot Map === */
    .shot-map-container { display: flex; flex-direction: column; gap: 10px; }
    .shot-map-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #666;
    }
    .meta-dot { color: #ccc; }
    .pitch-wrap {
      width: 100%;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid #e0e0e0;
    }
    .pitch {
      position: relative;
      width: 100%;
      aspect-ratio: 50 / 33;
      background: #2d8c3c;
    }
    .pitch-line {
      position: absolute;
      border: 1px solid rgba(255,255,255,0.25);
    }
    .center-line {
      left: 50%;
      top: 0; bottom: 0;
      width: 0;
      border-width: 0 1px 0 0;
      border-color: rgba(255,255,255,0.3);
    }
    .pitch-rect {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      border: 1.5px solid rgba(255,255,255,0.35);
    }
    .penalty-area { width: 40%; height: 44%; border-radius: 2px; }
    .six-yard { width: 18%; height: 22%; border-radius: 1px; }
    .shot-dot {
      position: absolute;
      width: 10px; height: 10px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      background: #ff9800;
      border: 2px solid rgba(255,255,255,0.7);
      cursor: pointer;
      transition: transform 0.1s ease;
      z-index: 1;
    }
    .shot-dot:hover { transform: translate(-50%, -50%) scale(1.4); z-index: 2; }
    .shot-dot.dot-goal {
      background: #4caf50;
      width: 14px; height: 14px;
      border-color: rgba(255,255,255,0.8);
    }
    .shot-dot.dot-goal:hover { transform: translate(-50%, -50%) scale(1.3); }
    .shot-legend {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #666;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
    }
    .legend-dot.dot-goal { background: #4caf50; }
    .legend-dot.dot-other { background: #ff9800; }

    /* === Responsive === */
    @media (max-width: 600px) {
      .summary-cards { grid-template-columns: repeat(2, 1fr); }
      .score { font-size: 28px; }
      .team-name { font-size: 14px; }
      .scoreboard { gap: 10px; }
      .pitch-wrap { border-radius: 4px; }
    }
  `]
})
export class V24MatchDetailPageComponent implements OnInit {
  private api = inject(MatchDetailApiService);
  private route = inject(ActivatedRoute);

  loading = false;
  error = '';
  detail: MatchDetail | null = null;

  ngOnInit(): void {
    const careerId = this.route.snapshot.paramMap.get('careerId');
    const matchId = this.route.snapshot.paramMap.get('matchId');
    if (!careerId || !matchId) { this.error = 'Missing career or match ID.'; return; }
    this.loading = true;
    this.error = '';
    this.api.getMatchDetail(careerId, matchId).subscribe({
      next: (data) => { this.detail = data; this.loading = false; },
      error: () => { this.error = 'Failed to load match detail.'; this.loading = false; }
    });
  }

  retry(): void { this.ngOnInit(); }

  // === Helpers ===
  private typeMap: Record<string, string> = {
    'GOAL': 'event-goal', 'SHOT': 'event-shot', 'SHOT_ON_TARGET': 'event-shot_on_target',
    'BLOCK': 'event-block', 'MISS': 'event-miss', 'FOUL': 'event-foul',
    'YELLOW_CARD': 'event-yellow_card', 'RED_CARD': 'event-red_card',
    'INJURY': 'event-injury', 'SUBSTITUTION': 'event-substitution',
    'OFFSIDE': 'event-offside', 'CORNER': 'event-corner', 'CHANCE_CREATED': 'event-chance_created'
  };
  eventClass(type: string): string { return this.typeMap[type] ?? 'event-shot'; }

  statsComparison(): { label: string; home: string; away: string }[] {
    if (!this.detail) return [];
    return [
      { label: 'Goals', home: String(this.detail.homeGoals), away: String(this.detail.awayGoals) },
      { label: 'xG', home: this.detail.homeXg.toFixed(2), away: this.detail.awayXg.toFixed(2) },
      { label: 'Shots', home: String(this.detail.homeShots), away: String(this.detail.awayShots) },
      { label: 'Possession', home: `${this.detail.homePossession}%`, away: `${this.detail.awayPossession}%` }
    ];
  }

  hasPlayerRatings(): boolean { return !!(this.detail?.playerRatings?.length); }

  playerRatingsByTeam(): { label: string; players: import('../models/match-detail.model').PlayerMatchRating[]; topPlayer?: import('../models/match-detail.model').PlayerMatchRating }[] {
    if (!this.detail?.playerRatings?.length) return [];
    const home = this.detail.playerRatings.filter(p => p.teamId === this.detail!.homeTeamId);
    const away = this.detail.playerRatings.filter(p => p.teamId === this.detail!.awayTeamId);
    const sorted = (list: import('../models/match-detail.model').PlayerMatchRating[]) => [...list].sort((a, b) => b.rating - a.rating);
    const withTop = (list: import('../models/match-detail.model').PlayerMatchRating[], label: string) => {
      const s = sorted(list);
      return { label, players: s, topPlayer: s[0] };
    };
    return [
      withTop(home, 'Home Team'),
      withTop(away, 'Away Team')
    ].filter(t => t.players.length > 0);
  }

  // === Shot Map helpers ===
  hasShotMap(): boolean { return !!(this.detail?.timeline?.some(e => e.shotCoordinate != null)); }
  shotMapEvents(): import('../models/match-detail.model').MatchEvent[] { return (this.detail?.timeline ?? []).filter(e => e.shotCoordinate != null); }
  shotGoalsCount(): number { return this.shotMapEvents().filter(e => e.type === 'GOAL').length; }
  isGoalEvent(event: import('../models/match-detail.model').MatchEvent): boolean { return event.type === 'GOAL'; }
  clamp(v: number | undefined | null): number { if (v == null) return 50; return Math.max(0, Math.min(100, v)); }
  formatTooltip(event: import('../models/match-detail.model').MatchEvent): string {
    const parts: string[] = [`${event.minute}'`];
    if (event.playerName) parts.push(event.playerName);
    parts.push(event.type);
    if (event.xg != null) parts.push(`xG ${event.xg.toFixed(2)}`);
    if (event.shotCoordinate?.location) parts.push(event.shotCoordinate.location.replace(/_/g, ' '));
    return parts.join(' • ');
  }
  averageShotXg(): number | null {
    const events = this.shotMapEvents();
    if (!events.length) return null;
    const withXg = events.filter(e => e.xg != null);
    if (!withXg.length) return null;
    return withXg.reduce((s, e) => s + (e.xg ?? 0), 0) / withXg.length;
  }
}
