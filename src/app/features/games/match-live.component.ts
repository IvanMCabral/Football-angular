import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { MatchState } from '../../core/services/match-engine.model';
import { CareerService } from '../../core/services/career.service';
import { MatchService } from '../matches/services/match.service';
import { Match } from '../../shared/models/match.model';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-match-live',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './match-live.component.html',
  styleUrls: ['./match-live.component.css']
})

export class MatchLiveComponent implements OnInit, OnDestroy {
  private engineService = inject(MatchEngineService);
  private careerService = inject(CareerService);
  private matchService = inject(MatchService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  matchId: string = '';
  gameId: string = '';
  matchState?: MatchState;
  teamNameMap: { [id: string]: string } = {};
  errorMsg: string = '';

  private pollingSubscription?: Subscription;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.gameId = params.get('gameId') || '';
      this.matchId = params.get('matchId') || '';

      if (!this.matchId || !this.gameId) {
        this.errorMsg = 'ID de partido o juego inválido';
        return;
      }

      this.careerService.getCareerTeams(this.gameId).subscribe(teams => {
        this.teamNameMap = {};
        teams.forEach(team => {
          const teamId = team.sessionTeamId || (typeof team.id === 'object' && 'value' in team.id ? (team.id as any).value : String(team.id));
          this.teamNameMap[teamId] = team.name;
        });
      });

      this.matchService.getMatch(this.matchId).subscribe({
        next: (match: Match) => {
          this.startEngine(match);
        },
        error: (err) => {
          this.errorMsg = 'No se pudo cargar el partido';
          console.error('[MATCH] Error loading match:', err);
        }
      });
    });
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  startEngine(match: Match) {
    const homeTeamId = typeof match.homeTeamId === 'object' && 'value' in match.homeTeamId
      ? (match.homeTeamId as any).value
      : String(match.homeTeamId);
    const awayTeamId = typeof match.awayTeamId === 'object' && 'value' in match.awayTeamId
      ? (match.awayTeamId as any).value
      : String(match.awayTeamId);

    this.engineService.startEngine(this.matchId, homeTeamId, awayTeamId).subscribe({
      next: (state) => {
        this.matchState = state;
        this.startPolling();
      },
      error: (err) => {
        this.errorMsg = 'No se pudo iniciar el motor del partido';
        console.error('[MATCH] Error starting engine:', err);
      }
    });
  }

  startPolling() {
    if (environment.useSse) {
      this.startSseStream();
    } else {
      this.startPollingInterval();
    }
  }

  startSseStream() {
    this.pollingSubscription = this.engineService.streamMatchState(this.matchId).subscribe({
      next: (state: MatchState) => {
        this.matchState = state;
        if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
        }
      },
      error: (err) => {
        console.error('[MATCH] Error in SSE stream:', err);
        this.errorMsg = 'Error en la conexión en tiempo real';
      },
      complete: () => {
      }
    });
  }

  startPollingInterval() {
    this.pollingSubscription = interval(1000).pipe(
      switchMap(() => {
        if (this.matchState?.status === 'RUNNING') {
          return this.engineService.getMatchState(this.matchId);
        }
        return [];
      })
    ).subscribe({
      next: (state: MatchState) => {
        if (state) {
          this.matchState = state;
          if (state.status === 'FINISHED' || state.status === 'CANCELLED') {
            this.stopPolling();
          }
        }
      },
      error: (err) => {
        console.error('[MATCH] Error polling state:', err);
      }
    });
  }

  stopPolling() {
    this.pollingSubscription?.unsubscribe();
  }

  pauseMatch() {
    this.engineService.pauseEngine(this.matchId).subscribe({
      next: (state) => {
        this.matchState = state;
      }
    });
  }

  resumeMatch() {
    this.engineService.resumeEngine(this.matchId).subscribe({
      next: (state) => {
        this.matchState = state;
      }
    });
  }

  stopMatch() {
    if (confirm('¿Estás seguro de que quieres cancelar el partido?')) {
      this.engineService.stopEngine(this.matchId).subscribe({
        next: (state) => {
          this.matchState = state;
          this.stopPolling();
        }
      });
    }
  }

  changeTactic(team: 'HOME' | 'AWAY', tactic: 'ATTACK' | 'DEFEND' | 'BALANCED') {
    this.engineService.sendCommand(this.matchId, {
      type: 'CHANGE_TACTIC',
      targetTeam: team,
      tactic: tactic
    }).subscribe();
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'NOT_STARTED': 'No Iniciado',
      'RUNNING': 'En Progreso',
      'PAUSED': 'Pausado',
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
}
