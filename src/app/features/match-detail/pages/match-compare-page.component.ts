// F6 Sprint 2 (LIVE-MATCH-F6-MATCH-COMPARE): Side-by-side comparison of
// baseline vs live match. Pattern mirrors V24MatchDetailPageComponent
// (subscribe + cdr.detectChanges) but uses OnPush because data loads
// once.

import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchCompareApiService } from '../services/match-compare-api.service';
import { MatchComparison } from '../models/match-compare.model';
import { MatchDetail } from '../models/match-detail.model';

@Component({
  selector: 'app-match-compare-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="compare-page">
      <header class="compare-header">
        <a (click)="navigateBack()" class="back-link">
          ← Volver al detalle
        </a>
        <h1 class="compare-title">🔄 Comparación de partido: baseline vs live</h1>
        <p *ngIf="comparison" class="compare-subtitle">
          {{ comparison.baseline.homeTeamName }} vs {{ comparison.baseline.awayTeamName }}
          · Temporada {{ comparison.baseline.seasonNumber }} · Fecha {{ comparison.baseline.round }}
        </p>
      </header>

      <div *ngIf="loading" class="loading">Cargando comparación...</div>
      <div *ngIf="error && !loading" class="error">{{ error }}</div>

      <ng-container *ngIf="comparison && !loading">
        <div class="compare-grid">
          <!-- Score + stats -->
          <section class="stats-section">
            <h2>📊 Estadísticas</h2>
            <table class="stats-table">
              <thead>
                <tr>
                  <th></th>
                  <th class="col-baseline">Baseline</th>
                  <th>Δ</th>
                  <th class="col-live">Live</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Resultado</td>
                  <td class="col-baseline">
                    <strong>{{ comparison.baseline.homeGoals }} - {{ comparison.baseline.awayGoals }}</strong>
                  </td>
                  <td>
                    <span [class]="deltaClass(comparison.diff.scoreDeltaHome)">
                      {{ formatDelta(comparison.diff.scoreDeltaHome, 0) }} / {{ formatDelta(comparison.diff.scoreDeltaAway, 0) }}
                    </span>
                  </td>
                  <td class="col-live">
                    <strong>{{ comparison.live.homeGoals }} - {{ comparison.live.awayGoals }}</strong>
                  </td>
                </tr>
                <tr>
                  <td>xG (Local / Visitante)</td>
                  <td class="col-baseline">
                    {{ comparison.baseline.homeXg | number:'1.2-2' }} / {{ comparison.baseline.awayXg | number:'1.2-2' }}
                  </td>
                  <td>
                    <span [class]="deltaClass(comparison.diff.xgDeltaHome)">
                      {{ formatDelta(comparison.diff.xgDeltaHome, 2) }} / {{ formatDelta(comparison.diff.xgDeltaAway, 2) }}
                    </span>
                  </td>
                  <td class="col-live">
                    {{ comparison.live.homeXg | number:'1.2-2' }} / {{ comparison.live.awayXg | number:'1.2-2' }}
                  </td>
                </tr>
                <tr>
                  <td>Tiros (Local / Visitante)</td>
                  <td class="col-baseline">
                    {{ comparison.baseline.homeShots }} / {{ comparison.baseline.awayShots }}
                  </td>
                  <td>
                    <span [class]="deltaClass(comparison.diff.shotsDeltaHome)">
                      {{ formatDelta(comparison.diff.shotsDeltaHome, 0) }} / {{ formatDelta(comparison.diff.shotsDeltaAway, 0) }}
                    </span>
                  </td>
                  <td class="col-live">
                    {{ comparison.live.homeShots }} / {{ comparison.live.awayShots }}
                  </td>
                </tr>
                <tr>
                  <td>Posesión local</td>
                  <td class="col-baseline">{{ comparison.baseline.homePossession }}%</td>
                  <td>
                    <span [class]="deltaClass(comparison.diff.possessionDeltaHome)">
                      {{ formatDelta(comparison.diff.possessionDeltaHome, 0) }}%
                    </span>
                  </td>
                  <td class="col-live">{{ comparison.live.homePossession }}%</td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Timeline diff (bucket-based) -->
          <section class="timeline-section">
            <h2>⏱️ Timeline (bloques de 5 min)</h2>
            <p class="timeline-hint">
              Cuenta de eventos por bucket. No se matchea por jugador porque el engine consume draws distintos en cada corrida.
            </p>
            <div class="timeline-grid">
              <div *ngFor="let bucket of bucketLabels" class="timeline-row">
                <span class="bucket-label">{{ bucket }}</span>
                <ng-container *ngFor="let type of diffTypes">
                  <span class="bucket-cell"
                        *ngIf="getCount(comparison, bucketIdx(bucket), type, 'baseline') > 0 || getCount(comparison, bucketIdx(bucket), type, 'live') > 0">
                    <strong>{{ typeAbbrev(type) }}</strong>
                    <span class="base-count">{{ getCount(comparison, bucketIdx(bucket), type, 'baseline') }}</span>
                    <span class="live-count">{{ getCount(comparison, bucketIdx(bucket), type, 'live') }}</span>
                  </span>
                </ng-container>
              </div>
            </div>
            <div class="timeline-legend">
              <span class="legend-base">baseline</span>
              <span class="legend-live">live</span>
            </div>
          </section>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .compare-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem;
      font-family: 'Roboto', sans-serif;
    }
    .compare-header {
      margin-bottom: 1.5rem;
    }
    .back-link {
      display: inline-block;
      margin-bottom: 0.5rem;
      color: #1976d2;
      text-decoration: none;
    }
    .back-link:hover { text-decoration: underline; }
    .compare-title {
      font-size: 1.75rem;
      margin: 0.5rem 0 0.25rem;
    }
    .compare-subtitle {
      color: #666;
      font-size: 0.9rem;
      margin: 0;
    }
    .loading, .error {
      padding: 2rem;
      text-align: center;
      color: #666;
    }
    .error { color: #c62828; }
    .compare-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    @media (min-width: 960px) {
      .compare-grid { grid-template-columns: 1fr 1fr; }
    }
    .stats-section, .timeline-section {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }
    .stats-section h2, .timeline-section h2 {
      margin: 0 0 0.75rem;
      font-size: 1.1rem;
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
    }
    .stats-table th, .stats-table td {
      padding: 0.5rem;
      text-align: center;
      border-bottom: 1px solid #f0f0f0;
    }
    .stats-table th:first-child, .stats-table td:first-child {
      text-align: left;
    }
    .col-baseline { background: #f5f5f5; }
    .col-live { background: #e3f2fd; }
    .delta-positive { color: #2e7d32; font-weight: bold; }
    .delta-negative { color: #c62828; font-weight: bold; }
    .delta-zero { color: #999; }
    .timeline-hint {
      font-size: 0.85rem;
      color: #666;
      margin: 0 0 0.5rem;
    }
    .timeline-grid {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .timeline-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
      border-bottom: 1px dashed #f0f0f0;
    }
    .bucket-label {
      font-weight: bold;
      min-width: 60px;
    }
    .bucket-cell {
      display: inline-flex;
      gap: 0.25rem;
      font-size: 0.8rem;
      padding: 0.15rem 0.4rem;
      background: #fafafa;
      border-radius: 4px;
    }
    .base-count { color: #555; }
    .live-count { color: #1976d2; font-weight: bold; }
    .timeline-legend {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.5rem;
    }
    .legend-base::before { content: '▼ '; color: #555; }
    .legend-live::before { content: '▼ '; color: #1976d2; }
  `],
})
export class MatchComparePageComponent implements OnInit {
  private api = inject(MatchCompareApiService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  careerId: string | null = null;
  matchId: string | null = null;
  comparison: MatchComparison | null = null;
  loading = false;
  error = '';

  // 18 buckets covering minutes [0,5), [5,10), ..., [85,90).
  readonly bucketLabels: string[] = Array.from({ length: 18 }, (_, i) => {
    const start = i * 5;
    const end = start + 5;
    return `${start}-${end}'`;
  });

  // 5 event types that are most relevant for the manager.
  readonly diffTypes: string[] = ['GOAL', 'SHOT', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION'];

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.careerId = this.route.snapshot.paramMap.get('careerId');
    this.matchId = this.route.snapshot.paramMap.get('matchId');
    if (!this.careerId || !this.matchId) {
      this.error = 'Faltan careerId o matchId en la URL.';
      this.cdr.markForCheck();
      return;
    }
    this.fetchComparison();
  }

  private fetchComparison(): void {
    if (!this.careerId || !this.matchId) return;
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api.getMatchCompare(this.careerId, this.matchId).subscribe({
      next: (data) => {
        this.comparison = data;
        this.loading = false;
        if (!data) {
          this.error = 'Comparación no disponible para este partido. '
            + 'El baseline puede haber expirado (TTL 7d) o el partido no se jugó por la ruta V24.';
          this.snackBar.open(this.error, 'Cerrar', { duration: 5000 });
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Error al cargar la comparación. Intente nuevamente.';
        this.loading = false;
        this.snackBar.open(this.error, 'Cerrar', { duration: 5000 });
        this.cdr.markForCheck();
      },
    });
  }

  formatDelta(delta: number, fractionDigits: number): string {
    if (delta === 0) return '±0';
    const sign = delta > 0 ? '+' : '';
    return sign + delta.toFixed(fractionDigits);
  }

  deltaClass(delta: number): string {
    if (delta > 0) return 'delta-positive';
    if (delta < 0) return 'delta-negative';
    return 'delta-zero';
  }

  bucketIdx(label: string): number {
    return this.bucketLabels.indexOf(label);
  }

  getCount(cmp: MatchComparison, bucket: number, type: string, side: 'baseline' | 'live'): number {
    const entry = cmp.diff.timelineDiff.find(
      (e) => e.bucket === bucket && e.type === type
    );
    if (!entry) return 0;
    return side === 'baseline' ? entry.baselineCount : entry.liveCount;
  }

  typeAbbrev(type: string): string {
    switch (type) {
      case 'GOAL': return 'G';
      case 'SHOT': return 'S';
      case 'YELLOW_CARD': return 'Y';
      case 'RED_CARD': return 'R';
      case 'SUBSTITUTION': return '⊕';
      default: return type.substring(0, 3);
    }
  }

  navigateBack(): void {
    if (this.careerId && this.matchId) {
      this.router.navigate(['/careers', this.careerId, 'matches', this.matchId, 'detail']);
    }
  }
}
