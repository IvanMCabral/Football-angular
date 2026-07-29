// Coach-readable side-by-side comparison between baseline and live match data.

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
import { MatchDetail, MatchEvent } from '../models/match-detail.model';

interface TimelineCompareRow {
  label: string;
  baselineSummary: string;
  liveSummary: string;
  xgDeltaHome: number;
  xgDeltaAway: number;
  quiet: boolean;
}

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

          <section class="coach-read-section">
            <h2>🧠 Lectura DT</h2>
            <div class="coach-read-card">
              <strong>{{ coachHeadline(comparison) }}</strong>
              <p>{{ coachSummary(comparison) }}</p>
            </div>
            <div class="coach-metrics">
              <span [class]="deltaClass(comparison.diff.xgDeltaHome)">
                xG local {{ formatDelta(comparison.diff.xgDeltaHome, 2) }}
              </span>
              <span [class]="deltaClass(comparison.diff.xgDeltaAway)">
                xG visitante {{ formatDelta(comparison.diff.xgDeltaAway, 2) }}
              </span>
              <span [class]="deltaClass(comparison.diff.shotsDeltaHome)">
                tiros local {{ formatDelta(comparison.diff.shotsDeltaHome, 0) }}
              </span>
              <span [class]="deltaClass(comparison.diff.possessionDeltaHome)">
                posesión local {{ formatDelta(comparison.diff.possessionDeltaHome, 0) }}%
              </span>
            </div>
          </section>

          <section class="timeline-section">
            <h2>⏱️ Timeline profesional (bloques de 5 min)</h2>
            <p class="timeline-hint">
              Lectura por tramo: eventos, xG y dominio. No matchea jugador por jugador porque el engine consume draws distintos en cada corrida.
            </p>
            <div class="timeline-grid">
              <div *ngFor="let row of timelineRows(comparison)" class="timeline-row" [class.quiet-row]="row.quiet">
                <div class="bucket-label">{{ row.label }}</div>
                <div class="bucket-side">
                  <strong>Baseline</strong>
                  <span>{{ row.baselineSummary }}</span>
                </div>
                <div class="bucket-delta" [class]="deltaClass(row.xgDeltaHome + row.xgDeltaAway)">
                  ΔxG {{ formatDelta(row.xgDeltaHome, 2) }} / {{ formatDelta(row.xgDeltaAway, 2) }}
                </div>
                <div class="bucket-side live-side">
                  <strong>Live</strong>
                  <span>{{ row.liveSummary }}</span>
                </div>
              </div>
            </div>
            <div class="timeline-legend">
              <span class="legend-base">baseline</span>
              <span class="legend-live">live</span>
              <span>G gol · T tiro · C chance · Y amarilla · R roja · S cambio</span>
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
    .compare-header { margin-bottom: 1.5rem; }
    .back-link {
      display: inline-block;
      margin-bottom: 0.5rem;
      color: #1976d2;
      text-decoration: none;
      cursor: pointer;
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
      .timeline-section { grid-column: 1 / -1; }
    }
    .stats-section, .timeline-section, .coach-read-section {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem 1.25rem;
    }
    .stats-section h2, .timeline-section h2, .coach-read-section h2 {
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
    .stats-table th:first-child, .stats-table td:first-child { text-align: left; }
    .col-baseline { background: #f5f5f5; }
    .col-live { background: #e3f2fd; }
    .delta-positive { color: #2e7d32; font-weight: bold; }
    .delta-negative { color: #c62828; font-weight: bold; }
    .delta-zero { color: #999; }
    .coach-read-card {
      padding: 0.9rem;
      border-radius: 8px;
      background: #f7fbff;
      border: 1px solid #d8eafd;
      margin-bottom: 0.75rem;
    }
    .coach-read-card p {
      margin: 0.35rem 0 0;
      color: #455a64;
      line-height: 1.35;
    }
    .coach-metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .coach-metrics span {
      padding: 0.25rem 0.45rem;
      border-radius: 999px;
      background: #f5f5f5;
      font-size: 0.8rem;
    }
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
      display: grid;
      grid-template-columns: 64px 1fr auto 1fr;
      align-items: stretch;
      gap: 0.5rem;
      padding: 0.4rem 0;
      border-bottom: 1px dashed #f0f0f0;
    }
    .quiet-row { opacity: 0.62; }
    .bucket-label {
      font-weight: bold;
      min-width: 60px;
      padding-top: 0.2rem;
    }
    .bucket-side {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.8rem;
      padding: 0.35rem 0.5rem;
      background: #fafafa;
      border-radius: 6px;
    }
    .live-side { background: #e3f2fd; }
    .bucket-delta {
      align-self: center;
      white-space: nowrap;
      font-size: 0.78rem;
      padding: 0.25rem 0.45rem;
      border-radius: 999px;
      background: #f5f5f5;
    }
    .timeline-legend {
      display: flex;
      flex-wrap: wrap;
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

  readonly bucketLabels: string[] = Array.from({ length: 18 }, (_, i) => {
    const start = i * 5;
    const end = start + 5;
    return `${start}-${end}'`;
  });

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
            + 'El baseline puede haber expirado (TTL 7d) o el partido no se jugó por la ruta de detalle actual.';
          this.snackBar.open(this.error, 'Cerrar', { duration: 5000 });
        }
        this.cdr.markForCheck();
      },
      error: () => {
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

  coachHeadline(cmp: MatchComparison): string {
    const liveHomeEdge = cmp.live.homeXg - cmp.live.awayXg;
    const baselineHomeEdge = cmp.baseline.homeXg - cmp.baseline.awayXg;
    const swing = liveHomeEdge - baselineHomeEdge;
    if (Math.abs(swing) < 0.08) return 'Partido parecido: el cambio no rompió el guion.';
    return swing > 0
      ? 'El live favoreció más al local que el baseline.'
      : 'El live favoreció menos al local que el baseline.';
  }

  coachSummary(cmp: MatchComparison): string {
    const pieces: string[] = [];
    pieces.push(`Resultado ${cmp.baseline.homeGoals}-${cmp.baseline.awayGoals} → ${cmp.live.homeGoals}-${cmp.live.awayGoals}.`);
    pieces.push(`xG ${cmp.baseline.homeXg.toFixed(2)}/${cmp.baseline.awayXg.toFixed(2)} → ${cmp.live.homeXg.toFixed(2)}/${cmp.live.awayXg.toFixed(2)}.`);
    pieces.push(`Tiros ${cmp.baseline.homeShots}/${cmp.baseline.awayShots} → ${cmp.live.homeShots}/${cmp.live.awayShots}.`);
    return pieces.join(' ');
  }

  timelineRows(cmp: MatchComparison): TimelineCompareRow[] {
    return this.bucketLabels.map((label, bucket) => {
      const baselineEvents = this.eventsForBucket(cmp.baseline, bucket);
      const liveEvents = this.eventsForBucket(cmp.live, bucket);
      const xgDeltaHome = this.bucketXg(cmp.live, bucket, cmp.live.homeTeamId)
        - this.bucketXg(cmp.baseline, bucket, cmp.baseline.homeTeamId);
      const xgDeltaAway = this.bucketXg(cmp.live, bucket, cmp.live.awayTeamId)
        - this.bucketXg(cmp.baseline, bucket, cmp.baseline.awayTeamId);
      return {
        label,
        baselineSummary: this.eventSummary(baselineEvents, cmp.baseline),
        liveSummary: this.eventSummary(liveEvents, cmp.live),
        xgDeltaHome,
        xgDeltaAway,
        quiet: baselineEvents.length === 0 && liveEvents.length === 0,
      };
    });
  }

  private eventsForBucket(detail: MatchDetail, bucket: number): MatchEvent[] {
    const start = bucket * 5;
    const end = start + 5;
    return detail.timeline.filter((event) => event.minute >= start && event.minute < end);
  }

  private bucketXg(detail: MatchDetail, bucket: number, teamId: string): number {
    return this.eventsForBucket(detail, bucket)
      .filter((event) => event.teamId === teamId)
      .reduce((sum, event) => sum + (event.xg ?? 0), 0);
  }

  private eventSummary(events: MatchEvent[], detail: MatchDetail): string {
    if (events.length === 0) return 'Sin eventos fuertes';
    const goals = this.countEvents(events, 'GOAL');
    const shots = events.filter((event) => ['SHOT', 'SHOT_ON_TARGET', 'MISS', 'GOAL'].includes(event.type)).length;
    const chances = this.countEvents(events, 'CHANCE_CREATED');
    const yellows = this.countEvents(events, 'YELLOW_CARD');
    const reds = this.countEvents(events, 'RED_CARD');
    const subs = this.countEvents(events, 'SUBSTITUTION');
    const xgHome = events
      .filter((event) => event.teamId === detail.homeTeamId)
      .reduce((sum, event) => sum + (event.xg ?? 0), 0);
    const xgAway = events
      .filter((event) => event.teamId === detail.awayTeamId)
      .reduce((sum, event) => sum + (event.xg ?? 0), 0);
    const parts = [
      goals ? `G ${goals}` : '',
      shots ? `T ${shots}` : '',
      chances ? `C ${chances}` : '',
      yellows ? `Y ${yellows}` : '',
      reds ? `R ${reds}` : '',
      subs ? `S ${subs}` : '',
      (xgHome || xgAway) ? `xG ${xgHome.toFixed(2)}/${xgAway.toFixed(2)}` : '',
    ].filter(Boolean);
    return parts.join(' · ') || this.genericEventSummary(events);
  }

  private countEvents(events: MatchEvent[], type: string): number {
    return events.filter((event) => event.type === type).length;
  }

  private genericEventSummary(events: MatchEvent[]): string {
    const counts = new Map<string, number>();
    events.forEach((event) => counts.set(event.type, (counts.get(event.type) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([type, count]) => `${this.readableEventType(type)} ${count}`)
      .join(' · ');
  }

  private readableEventType(type: string): string {
    switch (type) {
      case 'FOUL': return 'Falta';
      case 'OFFSIDE': return 'Offside';
      case 'CORNER': return 'Córner';
      case 'SAVE': return 'Atajada';
      case 'BLOCK': return 'Bloqueo';
      case 'INJURY': return 'Lesión';
      case 'TACTICAL_CHANGE': return 'Cambio táctico';
      default: return type.replace(/_/g, ' ').toLowerCase();
    }
  }

  navigateBack(): void {
    if (this.careerId && this.matchId) {
      this.router.navigate(['/careers', this.careerId, 'matches', this.matchId, 'detail']);
    }
  }
}
