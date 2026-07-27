import { combineLatest, of } from 'rxjs';
import { catchError, filter, map, shareReplay, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { Match } from '../../shared/models/match.model';
import { RoundMatchVM } from './models/round-live.model';

export function initializeRoundLiveComponent(ctx: any): void {
  ctx.vm$ = ctx.vmSubject.asObservable();
  ctx.registerDebugRoundLiveHook();
  setTimeout(() => ctx.registerDebugRoundLiveHook(), 0);

  ctx.vm$.pipe(
    takeUntil(ctx.destroy$),
    filter((vm: any) => vm.matches.length > 0 || !!vm.errorMsg),
    take(1)
  ).subscribe((vm: any) => ctx.tryAutoStartRound(vm));

  const routeParams$ = ctx.route.paramMap.pipe(
    map((params: any) => ({
      gameId: params.get('gameId') || '',
      roundNumber: params.get('round') ? parseInt(params.get('round')!, 10) : 1
    })),
    shareReplay(1)
  );

  const teams$ = routeParams$.pipe(
    switchMap((params: any) => ctx.careerService.getCareerTeams(params.gameId)),
    map((teams: any[]) => {
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
    switchMap(() => ctx.careerService.getCareerStatus())
  );

  const fixtures$ = routeParams$.pipe(
    switchMap((params: any) => ctx.careerService.getFixturesByRoundWithBye(params.roundNumber))
  );

  combineLatest([routeParams$, teams$, careerStatus$, fixtures$]).pipe(
    takeUntil(ctx.destroy$),
    tap(([params, teamMap, careerStatus, fixturesData]: any[]) => {
      ctx.loadingSubject.next(false);

      if (careerStatus.careerPhase === 'FINISHED' || params.roundNumber > careerStatus.totalRounds) {
        ctx.router.navigate([`/games/${params.gameId}/champion`]);
        return;
      }

      const userSessionTeamId = careerStatus.userSessionTeamId || '';
      ctx.currentUserSessionTeamId = userSessionTeamId || null;
      const fixtures = fixturesData.matches;
      const byeTeam: string | null = fixturesData.byeTeam ?? null;
      const hydratedTeamMap = hydrateRoundTeamMap(teamMap, fixtures);

      if (fixtures.length === 0) {
        ctx.updateVm({
          gameId: params.gameId,
          roundNumber: params.roundNumber,
          matches: [],
          teamNameMap: hydratedTeamMap,
          allFinished: false,
          errorMsg: `No hay partidos para la fecha ${params.roundNumber}`,
          isRoundPaused: false,
          byeTeam,
          anyStarted: false
        });
        return;
      }

      const matches = buildRoundLiveMatches(fixtures, userSessionTeamId, ctx);
      ctx.updateVm({
        gameId: params.gameId,
        roundNumber: params.roundNumber,
        matches,
        teamNameMap: hydratedTeamMap,
        allFinished: false,
        errorMsg: '',
        isRoundPaused: false,
        byeTeam,
        anyStarted: false
      });

      ctx.startRoundEngine(params.gameId, matches);
    }),
    catchError((err: unknown) => {
      ctx.logDevError('[ROUND] Error:', err);
      ctx.loadingSubject.next(false);
      return of(null);
    })
  ).subscribe();
}

function hydrateRoundTeamMap(teamMap: { [id: string]: string }, fixtures: any[]): { [id: string]: string } {
  const hydratedTeamMap = { ...teamMap };
  for (const fixture of fixtures) {
    if (fixture.homeTeamId && fixture.homeTeamName) hydratedTeamMap[String(fixture.homeTeamId)] = fixture.homeTeamName;
    if (fixture.awayTeamId && fixture.awayTeamName) hydratedTeamMap[String(fixture.awayTeamId)] = fixture.awayTeamName;
  }
  return hydratedTeamMap;
}

function buildRoundLiveMatches(fixtures: any[], userSessionTeamId: string, ctx: any): RoundMatchVM[] {
  return fixtures.map(fixture => {
    const match: Match = {
      id: fixture.matchId,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      round: fixture.round,
      scheduledAt: new Date().toISOString(),
      status: ctx.mapFixtureStatus(fixture.status),
      result: null,
      createdAt: new Date().toISOString(),
      simulatedAt: null
    };
    const homeId = String(match.homeTeamId);
    const awayId = String(match.awayTeamId);

    return {
      match,
      isUserMatch: homeId === userSessionTeamId || awayId === userSessionTeamId,
      userTeamId: homeId === userSessionTeamId || awayId === userSessionTeamId ? userSessionTeamId : undefined
    };
  });
}
