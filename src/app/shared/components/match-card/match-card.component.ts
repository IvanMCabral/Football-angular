import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../../shared/models/match.model';
import { MatchEvent, MatchState } from '../../../core/services/match-engine.model';

export type MatchCardState = MatchState;

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-card.component.html',
  styleUrl: './match-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchCardComponent {
  @Input() match!: Match;
  @Input() state: MatchCardState | undefined = undefined;
  @Input() isUserMatch: boolean = false;
  @Input() homeTeamName: string = '';
  @Input() awayTeamName: string = '';

  @Output() tacticChange = new EventEmitter<{ team: 'HOME' | 'AWAY'; tactic: 'ATTACK' | 'DEFEND' | 'BALANCED' }>();
  @Output() substitutionOpen = new EventEmitter<void>();
  @Output() formationOpen = new EventEmitter<void>();
  @Output() partidoOpen = new EventEmitter<void>();

  onTacticChange(team: 'HOME' | 'AWAY', tactic: 'ATTACK' | 'DEFEND' | 'BALANCED') {
    this.tacticChange.emit({ team, tactic });
  }

  onSubstitutionOpen(): void {
    this.substitutionOpen.emit();
  }

  onFormationOpen(): void {
    this.formationOpen.emit();
  }

  onPartidoOpen(): void {
    this.partidoOpen.emit();
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'NOT_STARTED': 'Por Iniciar',
      'RUNNING': 'En Juego',
      'PAUSED': 'Pausado',
      'HALF_TIME': 'Descanso',
      'FINISHED': 'Finalizado',
      'CANCELLED': 'Cancelado'
    };
    return statusMap[status] || status;
  }

  getEventIcon(eventType: string): string {
    const iconMap: { [key: string]: string } = {
      GOAL: '⚽',
      CARD: '🟨',
      INJURY: '🚑',
      SUBSTITUTION: '🔄'
    };
    return iconMap[eventType] || '📋';
  }

  getLastEvents(events: MatchEvent[] | undefined, count: number): MatchEvent[] {
    return (events || []).slice(-count).reverse();
  }

  /** Possession percentage clamped to 0-100. */
  homePossessionPct(): number {
    return Math.max(0, Math.min(100, this.state?.homePossession ?? 50));
  }

  awayPossessionPct(): number {
    return Math.max(0, Math.min(100, this.state?.awayPossession ?? 50));
  }
}
