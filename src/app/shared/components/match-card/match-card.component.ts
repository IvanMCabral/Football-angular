import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../../shared/models/match.model';

export interface MatchCardState {
  status: string;
  currentMinute: number;
  score: { home: number; away: number };
  homeTactic?: string;
  awayTactic?: string;
  /** Possession percentages (0-100) per team. */
  homePossession?: number;
  awayPossession?: number;
  /** Current style per team. */
  homeStyle?: string;
  awayStyle?: string;
  /** Current formation per team. */
  homeFormation?: string;
  awayFormation?: string;
  events?: any[];
}

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
      'GOAL': '⚽',
      'CARD': '🟨',
      'INJURY': '🚑',
      'SUBSTITUTION': '🔄'
    };
    return iconMap[eventType] || '📋';
  }

  getLastEvents(events: any[] | undefined, count: number): any[] {
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
