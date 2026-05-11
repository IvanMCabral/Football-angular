import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatchDetailApiService } from '../services/match-detail-api.service';
import { MatchDetail } from '../models/match-detail.model';

/**
 * V24D5E3: Read-only V24 Match Detail Page
 *
 * Route: /careers/:careerId/matches/:matchId/detail
 *
 * Reads V24 detailed match data from:
 * GET /api/careers/{careerId}/matches/{matchId}/detail
 *
 * Behavior:
 * - 200 → renders MatchDetail (summary + timeline + stats)
 * - 404 / null → renders friendly "unavailable" state
 * - 500 → renders error with retry button
 * - playerRatings empty → shows deferred message
 * - shotCoordinate null → shows deferred message for shot map
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
        <p class="loading-text">Loading match detail...</p>
      </div>

      <!-- Error state -->
      <div *ngIf="!loading && error" class="state-container">
        <p class="error-text">Failed to load match detail.</p>
        <button (click)="retry()" class="retry-btn">Retry</button>
        <a routerLink="/matches" class="back-link">Back to matches</a>
      </div>

      <!-- Detail unavailable state (404 / null) -->
      <div *ngIf="!loading && !error && detail === null" class="state-container">
        <h2>Match Detail</h2>
        <p class="unavailable-text">Detailed match data is not available for this match.</p>
        <div class="unavailable-reasons">
          <p>Possible reasons:</p>
          <ul>
            <li>Match was played before V24 detail persistence was enabled</li>
            <li>Detail persistence was disabled during simulation</li>
            <li>Endpoint is currently disabled</li>
          </ul>
        </div>
        <a routerLink="/matches" class="back-link">Back to matches</a>
      </div>

      <!-- Detail success state -->
      <div *ngIf="!loading && !error && detail !== null" class="detail-content">
        <!-- Header -->
        <div class="match-header">
          <a routerLink="/matches" class="back-link">← Back to matches</a>
          <div class="teams-score">
            <span class="team-name">{{ detail.homeTeamName }}</span>
            <span class="score">{{ detail.homeGoals }} – {{ detail.awayGoals }}</span>
            <span class="team-name">{{ detail.awayTeamName }}</span>
          </div>
          <div class="match-meta">
            <span>Round {{ detail.round }}</span>
            <span class="separator">•</span>
            <span>Season {{ detail.seasonNumber }}</span>
            <span class="separator">•</span>
            <span class="v24-badge">V24 Engine</span>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="card">
            <span class="card-label">xG</span>
            <span class="card-value">{{ detail.homeXg.toFixed(2) }} – {{ detail.awayXg.toFixed(2) }}</span>
          </div>
          <div class="card">
            <span class="card-label">Shots</span>
            <span class="card-value">{{ detail.homeShots }} – {{ detail.awayShots }}</span>
          </div>
          <div class="card">
            <span class="card-label">Possession</span>
            <span class="card-value">{{ detail.homePossession }}% – {{ detail.awayPossession }}%</span>
          </div>
          <div class="card">
            <span class="card-label">Goals</span>
            <span class="card-value">{{ detail.homeGoals }} – {{ detail.awayGoals }}</span>
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
              <span class="event-type" [class]="'event-' + event.type.toLowerCase()">{{ event.type }}</span>
              <span class="event-player">{{ event.playerName }}</span>
              <span class="event-assist" *ngIf="event.relatedPlayerName">
                (assist: {{ event.relatedPlayerName }})
              </span>
              <span class="event-xg" *ngIf="event.xg != null">xG {{ event.xg.toFixed(2) }}</span>
              <span class="event-desc">{{ event.description }}</span>
            </li>
          </ul>
        </div>

        <!-- Stats Comparison Section -->
        <div class="section">
          <h3 class="section-title">Stats</h3>
          <div class="stats-table">
            <div class="stats-row">
              <span class="stat-label">Goals</span>
              <span class="stat-home">{{ detail.homeGoals }}</span>
              <span class="stat-away">{{ detail.awayGoals }}</span>
            </div>
            <div class="stats-row">
              <span class="stat-label">xG</span>
              <span class="stat-home">{{ detail.homeXg.toFixed(2) }}</span>
              <span class="stat-away">{{ detail.awayXg.toFixed(2) }}</span>
            </div>
            <div class="stats-row">
              <span class="stat-label">Shots</span>
              <span class="stat-home">{{ detail.homeShots }}</span>
              <span class="stat-away">{{ detail.awayShots }}</span>
            </div>
            <div class="stats-row">
              <span class="stat-label">Possession</span>
              <span class="stat-home">{{ detail.homePossession }}%</span>
              <span class="stat-away">{{ detail.awayPossession }}%</span>
            </div>
          </div>
        </div>

        <!-- Players Section (Deferred) -->
        <div class="section">
          <h3 class="section-title">Players</h3>
          <div class="deferred-state">
            Player ratings are not available yet.
          </div>
        </div>

        <!-- Shots Section (Deferred) -->
        <div class="section">
          <h3 class="section-title">Shot Map</h3>
          <div class="deferred-state">
            Shot map will be available in a future update.
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .v24-match-detail-page {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }
    .state-container {
      text-align: center;
      padding: 40px 16px;
    }
    .loading-text {
      color: #666;
      font-size: 16px;
    }
    .error-text {
      color: #d32f2f;
      font-size: 16px;
      margin-bottom: 12px;
    }
    .retry-btn {
      padding: 8px 16px;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 16px;
    }
    .unavailable-text {
      color: #555;
      font-size: 16px;
      margin-bottom: 12px;
    }
    .unavailable-reasons {
      text-align: left;
      max-width: 400px;
      margin: 0 auto 20px;
      color: #777;
      font-size: 14px;
    }
    .unavailable-reasons ul {
      margin: 8px 0;
      padding-left: 20px;
    }
    .back-link {
      display: inline-block;
      margin-top: 8px;
      color: #1976d2;
      text-decoration: none;
      font-size: 14px;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .match-header {
      margin-bottom: 20px;
    }
    .teams-score {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      font-size: 28px;
      font-weight: bold;
      margin: 12px 0;
    }
    .team-name {
      color: #333;
    }
    .score {
      color: #1976d2;
    }
    .match-meta {
      text-align: center;
      color: #666;
      font-size: 14px;
    }
    .separator {
      margin: 0 6px;
    }
    .v24-badge {
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .card {
      background-color: #f5f5f5;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .card-label {
      display: block;
      font-size: 12px;
      color: #777;
      margin-bottom: 4px;
    }
    .card-value {
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      color: #333;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .empty-state {
      color: #999;
      font-size: 14px;
      font-style: italic;
      padding: 12px 0;
    }
    .timeline-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .timeline-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    }
    .event-minute {
      font-weight: bold;
      color: #1976d2;
      min-width: 30px;
    }
    .event-type {
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
    }
    .event-goal { background-color: #e8f5e9; color: #2e7d32; }
    .event-shot { background-color: #fff3e0; color: #e65100; }
    .event-foul { background-color: #ffebee; color: #c62828; }
    .event-yellow_card { background-color: #fff9c4; color: #f9a825; }
    .event-red_card { background-color: #ffcdd2; color: #c62828; }
    .event-injury { background-color: #e3f2fd; color: #0288d1; }
    .event-substitution { background-color: #f3e5f5; color: #7b1fa2; }
    .event-offside { background-color: #fafafa; color: #757575; }
    .event-corner { background-color: #e0f7fa; color: #00838f; }
    .event-player {
      color: #333;
      font-weight: 500;
    }
    .event-assist {
      color: #777;
      font-size: 13px;
    }
    .event-xg {
      color: #888;
      font-size: 12px;
    }
    .event-desc {
      color: #555;
      font-size: 13px;
    }
    .stats-table {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .stats-row {
      display: grid;
      grid-template-columns: 80px 1fr 1fr;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .stat-label {
      font-size: 13px;
      color: #666;
    }
    .stat-home {
      text-align: right;
      font-weight: 500;
      color: #333;
    }
    .stat-away {
      text-align: left;
      font-weight: 500;
      color: #333;
    }
    .deferred-state {
      color: #999;
      font-size: 14px;
      font-style: italic;
      padding: 12px 0;
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

    if (!careerId || !matchId) {
      this.error = 'Missing career or match ID.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.api.getMatchDetail(careerId, matchId).subscribe({
      next: (data) => {
        this.detail = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load match detail.';
        this.loading = false;
      }
    });
  }

  retry(): void {
    this.ngOnInit();
  }
}