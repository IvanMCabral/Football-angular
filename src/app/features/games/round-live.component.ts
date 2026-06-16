import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { CareerService } from '../../core/services/career.service';
import { Match } from '../../shared/models/match.model';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap, takeUntil, catchError, shareReplay } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { RoundLiveViewModel, RoundMatchVM } from './models/round-live.model';

@Component({
  selector: 'app-round-live',
  standalone: true,
  imports: [CommonModule, RouterLink, MatchCardComponent],
  templateUrl: './round-live.component.html',
  styleUrls: ['./round-live.component.css']
})
export class RoundLiveComponent implements OnInit, OnDestroy {
  private engineService = inject(MatchEngineService);
  private careerService = inject(CareerService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  private vmSubject = new BehaviorSubject<RoundLiveViewModel>({
    gameId: '',
    roundNumber: 1,
    matches: [],
    teamNameMap: {},
    allFinished: false,
    errorMsg: '',
    isRoundPaused: false,
    byeTeam: null // UX-6: BYE indicator
  });

  vm$: Observable<RoundLiveViewModel>;

  constructor() {
    this.vm$ = this.vmSubject.asObservable();

    const routeParams$ = this.route.paramMap.pipe(
      map(params => ({
        gameId: params.get('gameId') || '',
        roundNumber: params.get('round') ? parseInt(params.get('round')!) : 1
      })),
      shareReplay(1)
    );

    const teams$ = routeParams$.pipe(
      switchMap(params => this.careerService.getCareerTeams(params.gameId)),
      map(teams => {
        const teamMap: { [id: string]: string } = {};
        teams.forEach(team => {
          const teamId = team.sessionTeamId || String(team.id);
          teamMap[teamId] = team.name;
        });
        return teamMap;
      }),
      shareReplay(1)
    );

    const careerStatus$ = routeParams$.pipe(
      switchMap(params => this.careerService.getCareerStatus())
    );

    const fixtures$ = routeParams$.pipe(
      switchMap(params => this.careerService.getFixturesByRoundWithBye(params.roundNumber))
    );

    combineLatest([routeParams$, teams$, careerStatus$, fixtures$]).pipe(
      takeUntil(this.destroy$),
      tap(([params, teamMap, careerStatus, fixturesData]) => {
        if (careerStatus.careerPhase === 'FINISHED') {
          this.router.navigate([`/games/${params.gameId}/champion`]);
          return;
        }

        if (params.roundNumber > careerStatus.totalRounds) {
          this.router.navigate([`/games/${params.gameId}/champion`]);
          return;
        }

        const userSessionTeamId = careerStatus.userSessionTeamId || '';
        const fixtures = fixturesData.matches;
        const byeTeam: string | null = fixturesData.byeTeam ?? null;

        if (fixtures.length === 0) {
          this.updateVm({
            gameId: params.gameId,
            roundNumber: params.roundNumber,
            matches: [],
            teamNameMap: teamMap,
            allFinished: false,
            errorMsg: `No hay partidos para la fecha ${params.roundNumber}`,
            isRoundPaused: false,
            byeTeam
          });
          return;
        }

        const matches: RoundMatchVM[] = fixtures.map(fixture => {
          const match: Match = {
            id: fixture.matchId,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            round: fixture.round,
            scheduledAt: new Date().toISOString(),
            status: this.mapFixtureStatus(fixture.status),
            result: null,
            createdAt: new Date().toISOString(),
            simulatedAt: null
          };

          const homeId = String(match.homeTeamId);
          const awayId = String(match.awayTeamId);

          return {
            match,
            isUserMatch: homeId === userSessionTeamId || awayId === userSessionTeamId
          };
        });

        this.updateVm({
          gameId: params.gameId,
          roundNumber: params.roundNumber,
          matches,
          teamNameMap: teamMap,
          allFinished: false,
          errorMsg: '',
          isRoundPaused: false,
          byeTeam
        });

        this.startRoundEngine(params.gameId, matches);
      }),
      catchError(err => {
        console.error('[ROUND] Error:', err);
        return of(null);
      })
    ).subscribe();
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateVm(vm: RoundLiveViewModel) {
    this.vmSubject.next(vm);
  }

  private startRoundEngine(gameId: string, matches: RoundMatchVM[]) {
    const roundId = gameId;
    const matchData = matches.map(rm => ({
      matchId: String(rm.match.id),
      homeTeamId: String(rm.match.homeTeamId),
      awayTeamId: String(rm.match.awayTeamId)
    }));

    this.engineService.startRound(roundId, matchData).pipe(
      switchMap(() => this.engineService.streamRoundState(roundId)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (roundState) => {
        const currentVm = this.vmSubject.value;
        const updatedMatches = currentVm.matches.map(rm => {
          const matchState = roundState.matches.find(ms =>
            String(ms.matchId) === String(rm.match.id)
          );
          return {
            ...rm,
            state: matchState
          };
        });

        const newVm = {
          ...currentVm,
          matches: updatedMatches,
          allFinished: updatedMatches.every(m =>
            m.state?.status === 'FINISHED' ||
            m.state?.status === 'CANCELLED' ||
            roundState.status === 'COMPLETED'
          ),
          isRoundPaused: updatedMatches.some(m => m.state?.status === 'PAUSED')
        };

        this.updateVm(newVm);
      },
      error: (err) => {
        console.error('[ROUND] Error in SSE stream:', err);
      },
      complete: () => {
      }
    });
  }

  pauseAll() {
    const matches = this.vmSubject.value.matches;
    matches.forEach(rm => {
      const matchId = String(rm.match.id);
      if (rm.state?.status === 'RUNNING') {
        this.engineService.pauseEngine(matchId).subscribe();
      }
    });
    this.updateVm({ ...this.vmSubject.value, isRoundPaused: true });
  }

  resumeAll() {
    const vm = this.vmSubject.value;
    if (!vm.isRoundPaused) {
      return;
    }
    const matches = vm.matches;
    matches.forEach(rm => {
      const matchId = String(rm.match.id);
      if (rm.state?.status !== 'FINISHED' && rm.state?.status !== 'CANCELLED') {
        this.engineService.resumeEngine(matchId).subscribe();
      }
    });
    this.updateVm({ ...vm, isRoundPaused: false });
  }

  changeTactic(match: Match, team: 'HOME' | 'AWAY', tactic: 'ATTACK' | 'DEFEND' | 'BALANCED') {
    const matchId = String(match.id);
    const matches = this.vmSubject.value.matches;
    const rm = matches.find(r => String(r.match.id) === matchId);
    if (rm?.state?.status !== 'RUNNING') {
      return;
    }
    this.engineService.sendCommand(matchId, {
      type: 'CHANGE_TACTIC',
      targetTeam: team,
      tactic: tactic
    }).subscribe();
  }

  onTacticChange(match: Match, event: { team: 'HOME' | 'AWAY'; tactic: 'ATTACK' | 'DEFEND' | 'BALANCED' }) {
    this.changeTactic(match, event.team, event.tactic);
  }

  getTeamName(teamId: any, teamNameMap: { [id: string]: string } | null): string {
    const id = String(teamId);
    return teamNameMap?.[id] || id.substring(0, 8);
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

  getLastEvents(events: any[], count: number): any[] {
    return events.slice(-count).reverse();
  }

  // V24D11 UX-5: separar el partido del user del resto en la grilla
  get userMatch(): RoundMatchVM | null {
    return this.vmSubject.value.matches.find(m => m.isUserMatch) || null;
  }

  get otherMatches(): RoundMatchVM[] {
    return this.vmSubject.value.matches.filter(m => !m.isUserMatch);
  }

  private mapFixtureStatus(fixtureStatus: string): 'SCHEDULED' | 'SIMULATED' | 'CANCELLED' {
    switch (fixtureStatus) {
      case 'PENDING': case 'SIMULATING': return 'SCHEDULED';
      case 'COMPLETED': return 'SIMULATED';
      case 'CANCELLED': return 'CANCELLED';
      default: return 'SCHEDULED';
    }
  }

  goToRoundSummary() {
    const vm = this.vmSubject.value;
    this.router.navigate([`/games/${vm.gameId}/round/${vm.roundNumber}/summary`]);
  }
}
