import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Match } from '../../../shared/models/match.model';

export interface MatchCardState {
  status: string;
  currentMinute: number;
  score: { home: number; away: number };
  homeTactic?: string;
  awayTactic?: string;
  events?: any[];
}

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './match-card.component.html',
  styleUrl: './match-card.component.css'
})
export class MatchCardComponent {
  @Input() match!: Match;
  @Input() state: MatchCardState | undefined = undefined;
  @Input() isUserMatch: boolean = false;
  @Input() homeTeamName: string = '';
  @Input() awayTeamName: string = '';

  @Output() tacticChange = new EventEmitter<{ team: 'HOME' | 'AWAY'; tactic: 'ATTACK' | 'DEFEND' | 'BALANCED' }>();

  onTacticChange(team: 'HOME' | 'AWAY', tactic: 'ATTACK' | 'DEFEND' | 'BALANCED') {
    this.tacticChange.emit({ team, tactic });
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'NOT_STARTED': 'Por Iniciar',
      'RUNNING': 'En Juego',
      'PAUSED': 'Pausado',
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
}
