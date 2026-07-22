
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatchMinuteService, MatchMinuteState, MatchEvent } from '../services/match-minute.service';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './match-detail.component.html',
  styleUrls: ['./match-detail.component.css']
})
export class MatchDetailComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  matchId: string | null = null;
  minuteStates: MatchMinuteState[] = [];
  currentState: MatchMinuteState | null = null;
  isFinished = false;
  private timerSub: Subscription | null = null;
  private progressIndex = 0;
  private fetchSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private matchMinuteService: MatchMinuteService
  ) {}

  ngOnInit(): void {
    this.matchId = this.route.snapshot.paramMap.get('id');
    if (!this.matchId) {
      this.error = 'No se encontró el partido.';
      return;
    }
    this.loading = true;
    this.fetchSub = this.matchMinuteService.getMinuteByMinute(this.matchId).subscribe({
      next: (states) => {
        this.minuteStates = states;
        this.loading = false;
        this.startAnimation();
      },
      error: (err) => {
        this.error = 'No se pudo cargar el progreso del partido.';
        this.loading = false;
      }
    });
  }

  startAnimation(): void {
    this.progressIndex = 0;
    this.isFinished = false;
    if (this.timerSub) this.timerSub.unsubscribe();
    if (!this.minuteStates.length) return;
    this.currentState = this.minuteStates[0];
    this.timerSub = timer(0, 700).subscribe(() => {
      if (this.progressIndex < this.minuteStates.length) {
        this.currentState = this.minuteStates[this.progressIndex];
        this.progressIndex++;
      } else {
        this.isFinished = true;
        if (this.timerSub) this.timerSub.unsubscribe();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerSub) this.timerSub.unsubscribe();
    if (this.fetchSub) this.fetchSub.unsubscribe();
  }

  formatEventType(type: string | null | undefined): string {
    const map: Record<string, string> = {
      GOAL: 'Gol',
      SHOT: 'Remate',
      SHOT_ON_TARGET: 'Remate al arco',
      SAVE: 'Atajada',
      MISS: 'Remate desviado',
      BLOCK: 'Bloqueo',
      CHANCE_CREATED: 'Ocasión',
      FOUL: 'Falta',
      YELLOW_CARD: 'Amarilla',
      RED_CARD: 'Roja',
      INJURY: 'Lesión',
      CORNER: 'Córner',
      OFFSIDE: 'Offside',
      SUBSTITUTION: 'Cambio',
      CARD: 'Tarjeta',
      TACTICAL_CHANGE: 'Cambio táctico'
    };
    return map[(type || '').toUpperCase()] || type || 'Evento';
  }

  displayEventDescription(event: MatchEvent | null | undefined): string {
    if (!event) return '';
    const type = (event.type || '').toUpperCase();
    const description = event.description || '';
    const playerName = event.playerName || 'Jugador';

    if (type === 'SUBSTITUTION') {
      const match = description.match(/^Substitution:\s+(.+?)\s+on for\s+(.+)$/i);
      if (match) return `Cambio: entra ${match[1]}, sale ${match[2]}`;
      return 'Cambio realizado';
    }

    if (type === 'INJURY') return `${playerName} se lesionó`;
    if (description === 'Shot saved') return 'Remate atajado';
    if (description === 'Shot missed') return 'Remate desviado';
    if (description === 'Goal') return 'Gol';

    const formationMatch = description.match(/^Formation changed from (.+?) to (.+?)(?: \| pixels: (.*))?$/i);
    if (formationMatch) return `Cambio táctico: ${formationMatch[1]} → ${formationMatch[2]}`;

    return description || this.formatEventType(type);
  }
}
