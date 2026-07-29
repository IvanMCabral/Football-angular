import { Component, OnInit, OnChanges, SimpleChanges, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchDetailApiService } from '../services/match-detail-api.service';
import { MatchDetail } from '../models/match-detail.model';
import { MatchShotMapComponent } from '../components/shot-map/match-shot-map.component';
import { ShotInput } from '../components/shot-map/match-shot-map.model';
import { MatchEngineService } from '../../../core/services/match-engine.service';
import {
  SubstitutionDialogComponent,
  SubstitutionDialogData,
  SubstitutionDialogResult
} from '../components/substitution-dialog/substitution-dialog.component';

/**
 * Match detail page with score, timeline, player ratings and post-match data.
 */
@Component({
  selector: 'app-detailed-match-page',
  standalone: true,
  imports: [CommonModule, RouterLink, MatDialogModule, MatButtonModule, MatchShotMapComponent],
  templateUrl: './detailed-match-page.component.html',
  styleUrls: ['./detailed-match-page.component.scss']
})
export class DetailedMatchPageComponent implements OnInit, OnChanges {
  private api = inject(MatchDetailApiService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private engine = inject(MatchEngineService);

  loading = false;
  error = '';
  detail: MatchDetail | null = null;
  careerId: string | null = null;
  matchId: string | null = null;

  // Optional input bindings let debug surfaces mount this page directly.
  private _inputCareerId: string | null | undefined = undefined;
  private _inputMatchId: string | null | undefined = undefined;
  private _inputRefreshToken = 0;
  private _initialised = false;

  @Input()
  set inputCareerId(value: string | null | undefined) {
    const isNew = value !== this._inputCareerId;
    this._inputCareerId = value;
    this.careerId = value ?? null;
    if (this._initialised && isNew && this._inputCareerId && this._inputMatchId) {
      this.fetchDetail(this._inputCareerId, this._inputMatchId);
    }
  }
  get inputCareerId(): string | null | undefined { return this._inputCareerId; }

  @Input()
  set inputMatchId(value: string | null | undefined) {
    const isNew = value !== this._inputMatchId;
    this._inputMatchId = value;
    this.matchId = value ?? null;
    if (this._initialised && isNew && this._inputCareerId && this._inputMatchId) {
      this.fetchDetail(this._inputCareerId, this._inputMatchId);
    }
  }
  get inputMatchId(): string | null | undefined { return this._inputMatchId; }

  @Input()
  set inputRefreshToken(value: number | null | undefined) {
    const normalized = value ?? 0;
    const isNew = normalized !== this._inputRefreshToken;
    this._inputRefreshToken = normalized;
    if (this._initialised && isNew && this._inputCareerId && this._inputMatchId) {
      this.fetchDetail(this._inputCareerId, this._inputMatchId);
    }
  }
  get inputRefreshToken(): number { return this._inputRefreshToken; }

  ngOnInit(): void {
    // Avoid stale scroll position when navigating between matches.
    window.scrollTo(0, 0);

    // Prefer direct inputs when provided; otherwise read from the route.
    const careerId = this._inputCareerId || this.route.snapshot.paramMap.get('careerId');
    const matchId = this._inputMatchId || this.route.snapshot.paramMap.get('matchId');
    if (!careerId || !matchId) {
      this.error = 'Missing career or match ID.';
      this.cdr.detectChanges();
      this._initialised = true;
      return;
    }
    this.careerId = careerId;
    this.matchId = matchId;
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();
    this._initialised = true;

    this.fetchDetail(careerId, matchId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Refetch when a parent component selects another match after init.
    if (!this._initialised) {
      return;
    }
    const careerId = this._inputCareerId;
    const matchId = this._inputMatchId;
    if (changes['inputMatchId'] && careerId && matchId) {
      this.fetchDetail(careerId, matchId);
    } else if (changes['inputCareerId'] && careerId && matchId) {
      this.fetchDetail(careerId, matchId);
    } else if (changes['inputRefreshToken'] && careerId && matchId) {
      this.fetchDetail(careerId, matchId);
    }
  }

  retry(): void { this.ngOnInit(); }

  private fetchDetail(careerId: string, matchId: string): void {
    this.loading = true;
    this.error = '';
    this.detail = null;
    this.cdr.detectChanges();

    this.api.getMatchDetail(careerId, matchId).subscribe({
      next: (data) => {
        this.detail = data ?? null;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'No se pudo cargar el detalle del partido.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // === Helpers ===
  private typeMap: Record<string, string> = {
    'GOAL': 'event-goal', 'SHOT': 'event-shot', 'SHOT_ON_TARGET': 'event-shot_on_target',
    'BLOCK': 'event-block', 'MISS': 'event-miss', 'FOUL': 'event-foul',
    'YELLOW_CARD': 'event-yellow_card', 'RED_CARD': 'event-red_card',
    'INJURY': 'event-injury', 'SUBSTITUTION': 'event-substitution',
    'OFFSIDE': 'event-offside', 'CORNER': 'event-corner', 'CHANCE_CREATED': 'event-chance_created'
  };
  eventClass(type: string): string { return this.typeMap[type] ?? 'event-shot'; }

  private eventLabelMap: Record<string, string> = {
    GOAL: 'Gol',
    SHOT: 'Tiro',
    SHOT_ON_TARGET: 'Tiro al arco',
    BLOCK: 'Bloqueo',
    MISS: 'Tiro desviado',
    FOUL: 'Falta',
    YELLOW_CARD: 'Amarilla',
    RED_CARD: 'Roja',
    INJURY: 'LesiÃ³n',
    SUBSTITUTION: 'Cambio',
    OFFSIDE: 'Offside',
    CORNER: 'CÃ³rner',
    CHANCE_CREATED: 'Chance creada'
  };

  eventTypeLabel(type: string): string {
    return this.eventLabelMap[type] ?? type;
  }

  eventDescriptionLabel(description: string | null | undefined): string {
    if (!description) return '';
    return description
      .replace(/^Chance created for (.+)$/i, 'Chance creada para $1')
      .replace(/^Shot saved$/i, 'Tiro atajado')
      .replace(/^Shot missed$/i, 'Tiro desviado')
      .replace(/^Offside$/i, 'Offside')
      .replace(/^(.+) committed a foul$/i, '$1 cometiÃ³ una falta')
      .replace(/^(.+) received a yellow card$/i, '$1 recibiÃ³ amarilla')
      .replace(/^(.+) received a red card$/i, '$1 recibiÃ³ roja')
      .replace(/^(.+) scored$/i, 'Gol de $1')
      .replace(/^(.+) was injured$/i, '$1 se lesionÃ³')
      .replace(/^Substitution: (.+)$/i, 'Cambio: $1');
  }

  // Stats comparison includes a delta field for visual indication.
  // of home - away (color-coded green/red/grey in the template).
  statsComparison(): { label: string; home: string; away: string; delta: { value: number; formatted: string; winner: 'home' | 'away' | 'even' } }[] {
    if (!this.detail) return [];
    const row = (
      label: string,
      homeVal: number,
      awayVal: number,
      formatFn: (n: number) => string
    ) => {
      const value = homeVal - awayVal;
      const winner: 'home' | 'away' | 'even' = value > 0 ? 'home' : value < 0 ? 'away' : 'even';
      const formatted = value > 0 ? `+${formatFn(value)}` : value < 0 ? formatFn(value) : 'even';
      return { label, home: formatFn(homeVal), away: formatFn(awayVal), delta: { value, formatted, winner } };
    };
    return [
      row('Goles', this.detail.homeGoals, this.detail.awayGoals, n => String(Math.round(n))),
      row('xG', this.detail.homeXg, this.detail.awayXg, n => n.toFixed(2)),
      row('Tiros', this.detail.homeShots, this.detail.awayShots, n => String(Math.round(n))),
      row('Posesión', this.detail.homePossession, this.detail.awayPossession, n => `${Math.round(n)}%`)
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
      withTop(home, 'Equipo local'),
      withTop(away, 'Equipo visitante')
    ].filter(t => t.players.length > 0);
  }

  // Post-match condition summary.
  injuryEvents(): import('../models/match-detail.model').MatchEvent[] {
    return (this.detail?.timeline ?? []).filter(e => e.type === 'INJURY');
  }

  injuryEventsCount(): number { return this.injuryEvents().length; }

  hasInjuryEvents(): boolean { return this.injuryEventsCount() > 0; }

  yellowCardEvents(): import('../models/match-detail.model').MatchEvent[] {
    return (this.detail?.timeline ?? []).filter(e => e.type === 'YELLOW_CARD');
  }

  redCardEvents(): import('../models/match-detail.model').MatchEvent[] {
    return (this.detail?.timeline ?? []).filter(e => e.type === 'RED_CARD');
  }

  yellowCardCount(): number { return this.yellowCardEvents().length; }
  redCardCount(): number { return this.redCardEvents().length; }

  injuredPlayerSummary(): { playerName: string; minute: number }[] {
    return this.injuryEvents().map(e => ({
      playerName: e.playerName || 'Sin identificar',
      minute: e.minute
    }));
  }

  postMatchConditionLabel(): string {
    if (this.hasInjuryEvents()) {
      return `ðŸ¤• ${this.injuryEventsCount()} evento${this.injuryEventsCount() > 1 ? 's' : ''} de lesiÃ³n`;
    }
    return 'No se registraron lesiones en este partido.';
  }

  // Shot map.
  hasShotMap(): boolean { return !!(this.detail?.timeline?.some(e => e.shotCoordinate != null)); }
  /**
   * Build a strongly-typed ShotInput[] for the standalone MatchShotMapComponent.
   * The renderer owns projection, drawing, and tooltips.
   */
  shotInputs(): ShotInput[] {
    const tl = this.detail?.timeline ?? [];
    return tl
      .filter(e => !!e.shotCoordinate)
      .map(e => ({
        teamId: e.teamId,
        type: e.type,
        minute: e.minute,
        playerName: e.playerName,
        xg: e.xg ?? null,
        description: e.description,
        shotCoordinate: e.shotCoordinate,
      }));
  }

  /**
   * Opens the substitution dialog only when the page can use real players.
   * A professional DT flow must never show placeholder names or fake ids:
   * that makes the UI look editable while the engine receives meaningless
   * substitutions. Until Match Detail exposes the real bench, we block the
   * dialog instead of showing a false-positive substitution tool.
   */
  openSubstitutionDialog(): void {
    if (!this.detail?.matchId) {
      return;
    }
    const data = this.buildRealSubstitutionDialogData();
    if (!data) {
      this.snackBar.open(
        'Sustituciones reales bloqueadas: el detalle del partido todavÃ­a no expone titulares y suplentes reales. Hay que extender el DTO antes de habilitar este modal.',
        'Cerrar',
        {
          duration: 7000,
          panelClass: 'snack-warning',
          politeness: 'polite'
        }
      );
      return;
    }

    const dialogRef = this.dialog.open<SubstitutionDialogComponent, SubstitutionDialogData, SubstitutionDialogResult>(
      SubstitutionDialogComponent,
      { data, width: '560px', ariaLabel: 'Sustituir jugador' }
    );

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        return; // cancelled
      }
      this.engine.substitutePlayer(
        this.detail!.matchId,
        result.playerOffId,
        result.playerOnId,
        result.minute
      ).subscribe({
        next: (subResult: { success: boolean; minuteApplied: number; substitutionsRemaining: number; error?: string }) => {
          const msg = subResult.success
            ? `SustituciÃ³n registrada (minuto ${subResult.minuteApplied || result.minute}). Te quedan ${subResult.substitutionsRemaining ?? '?'}.`
            : `Error: ${subResult.error || 'sustituciÃ³n no aplicada'}`;
          this.snackBar.open(msg, 'Cerrar', {
            duration: 5000,
            panelClass: subResult.success ? 'snack-success' : 'snack-error',
            politeness: 'polite'
          });
          this.cdr.detectChanges();
        },
        error: (err: { message?: string } | unknown) => {
          const errMsg = this.substitutionErrorMessage(err);
          this.snackBar.open(`Error de red: ${errMsg}`, 'Cerrar', {
            duration: 5000,
            panelClass: 'snack-error',
            politeness: 'assertive'
          });
        }
      });
    });
  }

  private buildRealSubstitutionDialogData(): SubstitutionDialogData | null {
    if (!this.detail) {
      return null;
    }
    const toDialogPlayer = (p: { sessionPlayerId: string; name: string; position: string }) => ({
      sessionPlayerId: p.sessionPlayerId,
      name: p.name,
      position: p.position || 'MID'
    });
    const startingPlayers = (this.detail.homeStartingPlayers ?? [])
      .filter(p => p.sessionPlayerId && p.name && !this.isPlaceholderPlayerName(p.name))
      .map(toDialogPlayer);
    const benchPlayers = (this.detail.homeBenchPlayers ?? [])
      .filter(p => p.sessionPlayerId && p.name && !this.isPlaceholderPlayerName(p.name))
      .map(toDialogPlayer);

    if (startingPlayers.length < 7 || benchPlayers.length === 0) {
      return null;
    }

    return {
      matchId: this.detail.matchId,
      startingPlayers,
      benchPlayers,
      substitutionsRemaining: 5,
      currentMinute: 45,
    };
  }

  private isPlaceholderPlayerName(name: string): boolean {
    return /\bplaceholder\b/i.test(name);
  }

  private substitutionErrorMessage(err: unknown): string {
    const httpErr = err as { status?: number; error?: unknown; message?: string };
    const raw = typeof httpErr.error === 'string'
      ? httpErr.error
      : httpErr.error && typeof httpErr.error === 'object'
        ? JSON.stringify(httpErr.error)
        : '';
    const message = `${httpErr.message ?? ''} ${raw}`.trim();
    if (httpErr.status === 422 && /No active match session/i.test(message)) {
      return 'Este partido no tiene una sesión viva activa. Para probar sustituciones reales hay que iniciar el partido en modo live o usar el harness de replay/what-if.';
    }
    return httpErr.message || raw || String(err);
  }
}
