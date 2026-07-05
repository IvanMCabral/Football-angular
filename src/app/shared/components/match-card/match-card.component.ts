import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../../shared/models/match.model';

export interface MatchCardState {
  status: string;
  currentMinute: number;
  score: { home: number; away: number };
  homeTactic?: string;
  awayTactic?: string;
  /** LIVE-MATCH-F3-UI-LIVE FE6: possession percentages (0-100) per team. */
  homePossession?: number;
  awayPossession?: number;
  /** LIVE-MATCH-F3-UI-LIVE FE6: current style per team. */
  homeStyle?: string;
  awayStyle?: string;
  /** LIVE-MATCH-F3-UI-LIVE FE6: current formation per team. */
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
  // LIVE-MATCH-F3-UI-LIVE FE6: OnPush to align with the F3 strategy.
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatchCardComponent {
  @Input() match!: Match;
  @Input() state: MatchCardState | undefined = undefined;
  @Input() isUserMatch: boolean = false;
  @Input() homeTeamName: string = '';
  @Input() awayTeamName: string = '';

  @Output() tacticChange = new EventEmitter<{ team: 'HOME' | 'AWAY'; tactic: 'ATTACK' | 'DEFEND' | 'BALANCED' }>();
  // LIVE-MATCH-F3-UI-LIVE FE6: emit when the user clicks Sustituir / Formacion
  // on the user-match card. The parent (round-live or match-live) opens the
  // corresponding modal in response.
  @Output() substitutionOpen = new EventEmitter<void>();
  @Output() formationOpen = new EventEmitter<void>();
  // V25D89-FRONT-A: emit when the user clicks the new "Partido" button.
  // The parent (round-live) opens the dual-tab PartidoModalComponent in
  // response — Tab 1 editable manager formation + Tab 2 read-only rival
  // formation. Distinct from `formationOpen` (which only opens the F5
  // FormationModalComponent for the editable manager formation).
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
      'GOAL': '⚽', 'CARD': '🟨', 'INJURY': '🚑', 'SUBSTITUTION': '🔄'
    };
    return iconMap[eventType] || '📋';
  }

  getLastEvents(events: any[] | undefined, count: number): any[] {
    return (events || []).slice(-count).reverse();
  }

  /** LIVE-MATCH-F3-UI-LIVE FE6: possession % clamped 0-100. */
  homePossessionPct(): number {
    return Math.max(0, Math.min(100, this.state?.homePossession ?? 50));
  }

  awayPossessionPct(): number {
    return Math.max(0, Math.min(100, this.state?.awayPossession ?? 50));
  }
}
