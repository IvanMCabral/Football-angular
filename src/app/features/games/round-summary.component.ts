import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { CareerService } from '../../core/services/career.service';
import { Standing } from '../../core/services/career.model';
import { BehaviorSubject, Observable, forkJoin, of, timer } from 'rxjs';
import { map, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { RoundSummaryViewModel, SummaryMatchVM } from './models/round-summary.model';
import { readableErrorMessage } from '../../shared/utils/error-message';

@Component({
  selector: 'app-round-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './round-summary.component.html',
  styleUrls: ['./round-summary.component.css']
})
export class RoundSummaryComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private careerService = inject(CareerService);

  private destroy$ = new Subject<void>();

  private vmSubject = new BehaviorSubject<RoundSummaryViewModel>({
    gameId: '',
    roundNumber: 1,
    careerId: '',
    matches: [],
    standings: [],
    standingsLoading: true,
    standingsError: '',
    teamNameMap: {},
    userTeamId: '',
    userTeamName: '',
    userPosition: 0,
    careerPhase: 'WAITING_USER',
    tournamentStatus: null,
    errorMsg: '',
    byeTeam: null // UX-6: BYE indicator
  });

  vm$: Observable<RoundSummaryViewModel>;

  constructor() {
    this.vm$ = this.vmSubject.asObservable();

    this.route.paramMap.pipe(
      map(params => ({
        gameId: params.get('gameId') || '',
        roundNumber: params.get('round') ? parseInt(params.get('round')!) : 1
      })),
      switchMap(params => {
        this.updateVm({ ...this.vmSubject.value, standingsLoading: true, standingsError: '', errorMsg: '' });
        // These reads depend only on the route/session. Start them together
        // instead of waiting for teams, then fixtures, then standings.
        return forkJoin({
          teams: this.careerService.getCareerTeams(params.gameId),
          status: this.careerService.getCareerStatus(),
          fixtures: this.careerService.getFixturesByRoundWithBye(params.roundNumber),
          standings: this.careerService.getStandings().pipe(catchError(() => of(null)))
        }).pipe(map(data => ({ ...data, params })));
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ params, teams, status, fixtures, standings }) => {
        const teamMap: { [id: string]: string } = {};
        teams.forEach(team => teamMap[team.sessionTeamId || String(team.id)] = team.name);
        const userTeamId = status.userSessionTeamId || '';
        this.updateVm({
          gameId: params.gameId,
          roundNumber: params.roundNumber,
          careerId: status.careerId || '',
          matches: fixtures.matches.map(fixture => ({
            matchId: fixture.matchId,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
            homeGoals: fixture.homeGoals ?? 0,
            awayGoals: fixture.awayGoals ?? 0,
            status: fixture.status,
            isUserMatch: String(fixture.homeTeamId) === String(userTeamId) ||
                         String(fixture.awayTeamId) === String(userTeamId)
          })),
          standings: (standings || []).map(s => ({ ...s, wins: s.won, draws: s.drawn, losses: s.lost })),
          standingsLoading: false,
          standingsError: standings === null
            ? 'No pudimos cargar la clasificación. Volvé a abrir el resumen para intentar nuevamente.' : '',
          teamNameMap: teamMap,
          userTeamId,
          userTeamName: teamMap[userTeamId] || '',
          userPosition: standings ? standings.findIndex(s => s.teamId === userTeamId) + 1 : 0,
          careerPhase: status.careerPhase || 'WAITING_USER',
          tournamentStatus: {
            currentRound: status.currentRound,
            totalRounds: status.totalRounds,
            hasNextRound: params.roundNumber < status.totalRounds,
            isFinished: status.careerPhase === 'FINISHED' || status.currentRound > status.totalRounds,
            canPlayCurrentRound: status.canAdvanceRound && status.currentRound <= status.totalRounds,
            season: status.season
          },
          errorMsg: '',
          byeTeam: fixtures.byeTeam ?? null
        });
        // Retain the completion-status refresh, bounded by component lifetime.
        timer(100).pipe(takeUntil(this.destroy$)).subscribe(() => this.reloadCareerStatus());
      },
      error: () => this.updateVm({
        ...this.vmSubject.value, standingsLoading: false,
        standingsError: 'No pudimos cargar la clasificación.',
        errorMsg: 'Error al cargar el resumen. Volvé a abrirlo para intentar nuevamente.'
      })
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateVm(vm: RoundSummaryViewModel) {
    this.vmSubject.next(vm);
  }

  private loadStandings() {
    this.careerService.getStandings().pipe(takeUntil(this.destroy$)).subscribe({
      next: (standings) => {
        const vm = this.vmSubject.value;
        const userPosition = standings.findIndex(s => s.teamId === vm.userTeamId) + 1;

        const frontendStandings: Standing[] = standings.map(s => ({
          ...s,
          wins: s.won,
          draws: s.drawn,
          losses: s.lost
        }));

        this.updateVm({
          ...vm,
          standings: frontendStandings,
          standingsLoading: false,
          standingsError: '',
          userPosition
        });
      },
      error: () => {
        this.updateVm({
          ...this.vmSubject.value,
          standingsLoading: false,
          standingsError: 'No pudimos cargar la clasificación. Volvé a abrir el resumen para intentar nuevamente.'
        });
      }
    });
  }

  public reloadCareerStatus() {
    let attempts = 0;
    const maxAttempts = 5;
    const delayMs = 200;

    const fetchStatus = () => {
      this.careerService.getCareerStatus().subscribe({
        next: (status) => {
          const vm = this.vmSubject.value;
          const canPlayNextRound = status.canAdvanceRound && status.currentRound <= status.totalRounds;
          const hasNextRound = vm.roundNumber < status.totalRounds;
          const isTournamentEnded = status.careerPhase === 'FINISHED' || status.currentRound > status.totalRounds;
          const isStaleData = vm.roundNumber >= 21 && status.currentRound === vm.roundNumber && status.canAdvanceRound && status.careerPhase !== 'FINISHED';

          if (isStaleData && attempts < maxAttempts) {
            attempts++;
            setTimeout(fetchStatus, delayMs);
            return;
          }

          const newTournamentStatus = {
            currentRound: status.currentRound,
            totalRounds: status.totalRounds,
            hasNextRound,
            isFinished: isTournamentEnded,
            canPlayCurrentRound: canPlayNextRound,
            season: status.season
          };

          this.updateVm({
            ...vm,
            careerPhase: status.careerPhase || 'WAITING_USER',
            tournamentStatus: newTournamentStatus
          });
        },
        error: (err) => {
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(fetchStatus, delayMs);
          }
        }
      });
    };

    fetchStatus();
  }

  private calculateStandingsFromMatches() {
    const vm = this.vmSubject.value;

    const standingsMap = new Map<string, Standing>();

    vm.matches.forEach(match => {
      [match.homeTeamId, match.awayTeamId].forEach(teamId => {
        if (!standingsMap.has(teamId)) {
          standingsMap.set(teamId, {
            teamId,
            teamName: vm.teamNameMap[teamId] || '',
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
          });
        }
      });
    });

    vm.matches.forEach(match => {
      const home = standingsMap.get(match.homeTeamId);
      const away = standingsMap.get(match.awayTeamId);

      if (home && away) {
        home.played++;
        away.played++;
        home.goalsFor += match.homeGoals;
        away.goalsFor += match.awayGoals;
        home.goalsAgainst += match.awayGoals;
        away.goalsAgainst += match.homeGoals;
        home.goalDifference = home.goalsFor - home.goalsAgainst;
        away.goalDifference = away.goalsFor - away.goalsAgainst;

        if (match.homeGoals > match.awayGoals) {
          home.won++;
          home.points += 3;
          away.lost++;
        } else if (match.homeGoals < match.awayGoals) {
          away.won++;
          away.points += 3;
          home.lost++;
        } else {
          home.drawn++;
          away.drawn++;
          home.points++;
          away.points++;
        }
      }
    });

    const standings = Array.from(standingsMap.values())
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);

    const userPosition = standings.findIndex(s => s.teamId === vm.userTeamId) + 1;

    this.updateVm({
      ...vm,
      standings,
      userPosition
    });
  }

  getTeamName(teamId: string): string {
    const vm = this.vmSubject.value;
    return vm.teamNameMap[teamId] || teamId.substring(0, 8);
  }

  /**
   * Navigate to the detailed view for a completed match.
   */
  goToMatchDetail(matchId: string) {
    const vm = this.vmSubject.value;
    if (!vm.careerId || !matchId) {
      return;
    }
    this.router.navigate(['/careers', vm.careerId, 'matches', matchId, 'detail']);
  }

  playNextRound() {
    const vm = this.vmSubject.value;

    if (vm.tournamentStatus?.isFinished) {
      this.router.navigate([`/games/${vm.gameId}/champion`]);
      return;
    }

    // Prefer the server-side current round and fall back to the URL round
    // when status is unavailable. This avoids navigating from a stale summary
    // if the career has already advanced elsewhere.
    const nextRound = (vm.tournamentStatus?.currentRound ?? vm.roundNumber) + 1;

    if (vm.tournamentStatus && nextRound > vm.tournamentStatus.totalRounds) {
      this.router.navigate([`/games/${vm.gameId}/champion`]);
      return;
    }

    this.router.navigate([`/games/${vm.gameId}/round/${nextRound}/live`]);
  }

  goToChampion() {
    const vm = this.vmSubject.value;
    this.router.navigate([`/games/${vm.gameId}/champion`]);
  }

  backToGame() {
    this.router.navigate(['/squad']);
  }

  continueToNewSeason() {
    this.careerService.continueToNewSeason().subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/squad']);
        } else {
          this.vmSubject.next({
            ...this.vmSubject.value,
            errorMsg: response.message || 'Error al iniciar nueva temporada'
          });
        }
      },
      error: (err) => {
        this.vmSubject.next({
          ...this.vmSubject.value,
          errorMsg: readableErrorMessage(err, 'Error al iniciar nueva temporada')
        });
      }
    });
  }
}
