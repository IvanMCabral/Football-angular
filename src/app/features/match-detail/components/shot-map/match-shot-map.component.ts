import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  PITCH_GEOMETRY,
  ProjectedShot,
  ShotInput,
  ShotProjectionContext,
  classifyShotSide,
  clamp,
  projectShotX,
  projectShotY,
} from './match-shot-map.model';

interface ShotMarkerClass {
  home: boolean;
  away: boolean;
  goal: boolean;
  isGoal: boolean;
}

/**
 * V24D6O: Clean deterministic Shot Map renderer.
 *
 * - Backend provides shot data + normalized coordinates (0..100 x/y).
 * - Frontend owns drawing the pitch and projecting coords.
 * - Geometry defined as percentages, not magic pixels.
 * - Mirrors away team horizontally so both attack opposite ends.
 */
@Component({
  selector: 'app-match-shot-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="shot-map-header">
      <span>{{ shots.length }} shots</span>
      <span class="meta-dot">·</span>
      <span>{{ goalCount }} goals</span>
      <span class="meta-dot" *ngIf="avgXg !== null">·</span>
      <span *ngIf="avgXg !== null">Avg xG {{ avgXg.toFixed(2) }}</span>
    </div>

    <div class="pitch-frame">
      <div class="pitch" role="img" aria-label="Shot map">
        <!-- Center line at x=50 -->
        <div class="pitch-line center-line"></div>

        <!-- Center circle (9.15% radius, 50%/50%) -->
        <div class="pitch-circle center-circle"></div>

        <!-- Left penalty area: x [0..18], y [21..79] -->
        <div class="pitch-box left-area"></div>
        <!-- Left six-yard box: x [0..6], y [36..64] -->
        <div class="pitch-box left-six"></div>
        <!-- Left goal: x [0..2], y [44..56] -->
        <div class="pitch-box left-goal"></div>
        <!-- Left penalty spot: x=12, y=50 -->
        <div class="pitch-spot left-pen-spot"></div>
        <!-- Left penalty arc: visual hint using circle outline -->
        <div class="pitch-arc left-arc"></div>

        <!-- Right penalty area: x [82..100], y [21..79] -->
        <div class="pitch-box right-area"></div>
        <!-- Right six-yard box: x [94..100], y [36..64] -->
        <div class="pitch-box right-six"></div>
        <!-- Right goal: x [98..100], y [44..56] -->
        <div class="pitch-box right-goal"></div>
        <!-- Right penalty spot: x=88, y=50 -->
        <div class="pitch-spot right-pen-spot"></div>
        <!-- Right penalty arc -->
        <div class="pitch-arc right-arc"></div>

        <!-- Shot markers -->
        <div
          *ngFor="let shot of shots; trackBy: trackByKey"
          class="shot-marker"
          [ngClass]="markerClasses(shot)"
          [style.left.%]="shot.x"
          [style.top.%]="shot.y"
          [title]="formatTooltip(shot)"
          [attr.aria-label]="formatTooltip(shot)">
        </div>
      </div>
    </div>

    <div class="shot-legend">
      <span class="legend-item">
        <span class="legend-dot dot-goal"></span> Goal
      </span>
      <span class="legend-item">
        <span class="legend-dot dot-other"></span> Shot / Block / Miss
      </span>
      <span class="legend-item">
        <span class="legend-side home-side">Home ▸</span> attacks right
      </span>
      <span class="legend-item">
        <span class="legend-side away-side">◂ Away</span> attacks left
      </span>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .shot-map-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #666;
      margin-bottom: 8px;
    }
    .meta-dot { color: #ccc; }

    .pitch-frame {
      width: 100%;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid #e0e0e0;
    }

    /* Pitch is a 100x100 logical space. Aspect ratio 100/64 to match a
       real football pitch (about 105m x 68m). */
    .pitch {
      position: relative;
      width: 100%;
      aspect-ratio: 100 / 64;
      background:
        linear-gradient(180deg, #2d8c3c 0%, #2d8c3c 100%);
    }

    /* Lines and boxes use the 0..100 coordinate system. */
    .pitch-line, .pitch-box, .pitch-circle, .pitch-spot, .pitch-arc {
      position: absolute;
    }

    /* Center line: vertical line at x=50 spanning the full height. */
    .center-line {
      left: 50%;
      top: 0;
      bottom: 0;
      width: 0;
      border-left: 1.5px solid rgba(255, 255, 255, 0.7);
      transform: translateX(-0.75px);
    }

    /* Center circle: radius 9.15% centered at 50%/50%. */
    .center-circle {
      left: 50%;
      top: 50%;
      width: 18.3%; /* diameter = 2*radius */
      height: 18.3%;
      /* aspect-ratio of pitch is 100/64; the circle is rendered as a
         rectangle but visually appears as an ellipse. To keep it round,
         use the height (smaller dimension) as the reference. */
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }

    /* Penalty area: x [0..18], y [21..79] */
    .left-area {
      left: 0;
      top: 21%;
      width: 18%;
      height: 58%;
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      border-left: none;
    }
    /* Right penalty area: x [82..100], y [21..79] */
    .right-area {
      right: 0;
      top: 21%;
      width: 18%;
      height: 58%;
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      border-right: none;
    }

    /* Six-yard box: x [0..6], y [36..64] */
    .left-six {
      left: 0;
      top: 36%;
      width: 6%;
      height: 28%;
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      border-left: none;
    }
    /* Right six-yard box: x [94..100], y [36..64] */
    .right-six {
      right: 0;
      top: 36%;
      width: 6%;
      height: 28%;
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      border-right: none;
    }

    /* Goals: x [0..2] and x [98..100], y [44..56] */
    .left-goal {
      left: 0;
      top: 44%;
      width: 2%;
      height: 12%;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 1px;
    }
    .right-goal {
      right: 0;
      top: 44%;
      width: 2%;
      height: 12%;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 1px;
    }

    /* Penalty spots: 0.6% of pitch width circles, 1:1 aspect. */
    .pitch-spot {
      width: 0.9%;
      height: 1.4%;
      background: #fff;
      border-radius: 50%;
      transform: translate(-50%, -50%);
    }
    .left-pen-spot { left: 12%; top: 50%; }
    .right-pen-spot { left: 88%; top: 50%; }

    /* Penalty arcs (D): small arcs just outside the penalty area. */
    .pitch-arc {
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      border-radius: 50%;
      border-color: transparent transparent rgba(255, 255, 255, 0.7) transparent;
      background: transparent;
    }
    .left-arc {
      left: 16%;
      top: 50%;
      width: 8%;
      height: 25%;
      transform: translate(-50%, -50%);
    }
    .right-arc {
      left: 84%;
      top: 50%;
      width: 8%;
      height: 25%;
      transform: translate(-50%, -50%);
    }

    /* Shot markers */
    .shot-marker {
      position: absolute;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      border: 1.5px solid rgba(255, 255, 255, 0.9);
      cursor: pointer;
      z-index: 1;
      transition: transform 0.1s ease, z-index 0.1s ease;
    }
    .shot-marker.home { background: #1976d2; }
    .shot-marker.away { background: #e65100; }
    .shot-marker.home.goal {
      background: #2e7d32;
      width: 14px;
      height: 14px;
      border-color: #fff;
    }
    .shot-marker.away.goal {
      background: #c62828;
      width: 14px;
      height: 14px;
      border-color: #fff;
    }
    .shot-marker.home:not(.goal) { background: #42a5f5; }
    .shot-marker.away:not(.goal) { background: #ff9800; }
    .shot-marker:hover { transform: translate(-50%, -50%) scale(1.4); z-index: 2; }

    .shot-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 16px;
      font-size: 12px;
      color: #666;
      margin-top: 8px;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .legend-dot.dot-goal { background: #2e7d32; }
    .legend-dot.dot-other { background: #ff9800; }
    .legend-side {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .legend-side.home-side { background: #e3f2fd; color: #1565c0; }
    .legend-side.away-side { background: #fff3e0; color: #e65100; }

    @media (max-width: 600px) {
      .shot-marker { width: 9px; height: 9px; }
      .shot-marker.home.goal, .shot-marker.away.goal { width: 12px; height: 12px; }
    }
  `],
})
export class MatchShotMapComponent implements OnChanges {
  @Input() shotsInput: ShotInput[] = [];
  @Input() homeTeamId: string | null | undefined = null;
  @Input() awayTeamId: string | null | undefined = null;

  shots: ProjectedShot[] = [];
  goalCount = 0;
  avgXg: number | null = null;

  ngOnChanges(_changes: SimpleChanges): void {
    const ctx: ShotProjectionContext = {
      homeTeamId: this.homeTeamId,
      awayTeamId: this.awayTeamId,
    };
    this.shots = this.shotsInput
      .filter(s => !!s.shotCoordinate)
      .map(s => this.project(s, ctx));
    this.goalCount = this.shots.filter(s => s.isGoal).length;
    this.avgXg = this.computeAvgXg(this.shots);
  }

  private project(shot: ShotInput, ctx: ShotProjectionContext): ProjectedShot {
    const side = classifyShotSide(shot, ctx);
    const x = projectShotX(shot, ctx);
    const y = projectShotY(shot);
    return {
      side,
      isGoal: shot.type === 'GOAL',
      x,
      y,
      key: `${shot.minute}-${shot.teamId}-${shot.playerName}-${x.toFixed(2)}-${y.toFixed(2)}`,
      minute: shot.minute,
      type: shot.type,
      playerName: shot.playerName,
      xg: shot.xg ?? null,
      description: shot.description,
      location: shot.shotCoordinate?.location ?? null,
      rawTeamId: shot.teamId,
    };
  }

  private computeAvgXg(shots: ProjectedShot[]): number | null {
    const withXg = shots.filter(s => s.xg != null);
    if (!withXg.length) return null;
    const sum = withXg.reduce((s, sh) => s + (sh.xg ?? 0), 0);
    return sum / withXg.length;
  }

  trackByKey = (_: number, shot: ProjectedShot) => shot.key;

  markerClasses(shot: ProjectedShot): ShotMarkerClass {
    return {
      home: shot.side === 'home',
      away: shot.side === 'away',
      goal: shot.isGoal,
      isGoal: shot.isGoal,
    };
  }

  formatTooltip(shot: ProjectedShot): string {
    const parts: string[] = [`${shot.minute}'`];
    if (shot.playerName) parts.push(shot.playerName);
    parts.push(shot.type);
    if (shot.xg != null) parts.push(`xG ${shot.xg.toFixed(2)}`);
    if (shot.location) parts.push(shot.location.replace(/_/g, ' '));
    return parts.join(' • ');
  }
}
