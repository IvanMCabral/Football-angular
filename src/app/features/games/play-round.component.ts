import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatchService } from '../matches/services/match.service';
import { CareerService } from '../../core/services/career.service';
import { Match, MatchEvent } from '../../shared/models/match.model';

@Component({
  selector: 'app-play-round',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './play-round.component.html',
  styleUrls: ['./play-round.component.css']
})
export class PlayRoundComponent implements OnInit {
  matches: Match[] = [];
  animatedMatches: any[] = [];
  loading = true;
  teamNameMap: { [id: string]: string } = {};
  private matchService = inject(MatchService);
  private careerService = inject(CareerService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  gameId: string = '';

  ngOnInit() {
    this.animatedMatches = [];
    this.loading = true;
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.gameId = id;
      this.careerService.getCareerTeams(this.gameId).subscribe(teams => {
        this.teamNameMap = {};
        teams.forEach(team => {
          const teamId = team.sessionTeamId || team.id;
          this.teamNameMap[teamId] = team.name;
        });
        this.simulateAndAnimateFirstRound();
      });
    });
  }

  simulateAndAnimateFirstRound() {
    this.animatedMatches = [];
    this.matchService.getMatchesByGameId(this.gameId).subscribe((matches: Match[]) => {
      const rounds = matches.filter((m: Match) => m.round != null).map((m: Match) => m.round!);
      const firstRound = rounds.length > 0 ? Math.min(...rounds) : 1;
      const firstRoundMatches = matches.filter((m: Match) => m.round === firstRound);
      if (firstRoundMatches.length === 0) {
        this.animatedMatches = [];
        this.loading = false;
        return;
      }
      // Simular solo si hay partidos pendientes de simulación
      const pending = firstRoundMatches.filter((m: Match) => !m.result);
      if (pending.length > 0) {
        let simulated: Match[] = [];
        let count = 0;
        pending.forEach((match: Match) => {
          this.matchService.simulateMatch(match.id).subscribe((sim: Match) => {
            simulated.push(sim);
            count++;
            if (count === pending.length) {
              // Volver a cargar los partidos de la primera fecha ya simulados
              this.matchService.getMatchesByGameId(this.gameId).subscribe((updated: Match[]) => {
                const updatedFirstRound = updated.filter((m: Match) => m.round === firstRound);
                this.animateMatches(updatedFirstRound);
              });
            }
          });
        });
      } else {
        // Si ya están simulados, solo animar una vez
        this.animateMatches(firstRoundMatches);
      }
    });
  }

  animateMatches(matches: Match[]) {
    this.animatedMatches = [];
    // Si TODOS los partidos no tienen eventos, mostrar todos de una vez y salir del loading
    const allNoEvents = matches.every(m => (m.result?.events?.length ?? 0) === 0);
    if (allNoEvents) {
      this.animatedMatches = matches.map(match => ({
        match,
        currentMinute: 90,
        partialHomeGoals: match.result?.homeGoals ?? 0,
        partialAwayGoals: match.result?.awayGoals ?? 0,
        currentEvent: null,
        finished: true
      }));
      this.loading = false;
      return;
    }
    this.loading = false;
    let i = 0;
    const animateNext = () => {
      if (i >= matches.length) return;
      const match = matches[i];
      const events = match.result?.events || [];
      if (events.length === 0) {
        this.animatedMatches.push({
          match,
          currentMinute: 90,
          partialHomeGoals: match.result?.homeGoals ?? 0,
          partialAwayGoals: match.result?.awayGoals ?? 0,
          currentEvent: null,
          finished: true
        });
        i++;
        this.animatedMatches = [...this.animatedMatches];
        animateNext();
        return;
      }
      // Animación normal si hay eventos
      let currentMinute = 0;
      let partialHomeGoals = 0;
      let partialAwayGoals = 0;
      let currentEventIdx = 0;
      let finished = false;
      let currentEvent = null;
      const animObj: {
        match: Match;
        currentMinute: number;
        partialHomeGoals: number;
        partialAwayGoals: number;
        currentEvent: MatchEvent | null;
        finished: boolean;
      } = {
        match,
        currentMinute,
        partialHomeGoals,
        partialAwayGoals,
        currentEvent: null,
        finished
      };
      this.animatedMatches.push(animObj);
      const maxMinute = Math.max(...events.map(e => e.minute));
      const interval = setInterval(() => {
        if (currentEventIdx < events.length && events[currentEventIdx].minute === currentMinute) {
          currentEvent = events[currentEventIdx];
          animObj.currentEvent = currentEvent;
          if (currentEvent.type === 'GOAL') {
            if (currentEvent.description.includes('local') || currentEvent.description.includes('Home')) {
              partialHomeGoals++;
            } else {
              partialAwayGoals++;
            }
          }
          currentEventIdx++;
        } else {
          animObj.currentEvent = null;
        }
        animObj.currentMinute = currentMinute;
        animObj.partialHomeGoals = partialHomeGoals;
        animObj.partialAwayGoals = partialAwayGoals;
        if (currentMinute >= maxMinute) {
          animObj.finished = true;
          clearInterval(interval);
          setTimeout(() => {
            i++;
            this.animatedMatches = [...this.animatedMatches];
            animateNext();
          }, 1200);
        } else {
          currentMinute++;
          this.animatedMatches = [...this.animatedMatches];
        }
      }, 350);
    };
    animateNext();
  }
}
