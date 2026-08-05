import { combineLatest, of } from 'rxjs';
import { catchError, filter, map, shareReplay, startWith, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { Match } from '../../shared/models/match.model';
import { RoundMatchVM } from './models/round-live.model';
import { readRoundStartNavigationState } from './round-start-navigation-state';
import { markMatchStartStage, setMatchStartTraceMetadata } from './match-start-trace';

export function initializeRoundLiveComponent(ctx: any): void {
  markMatchStartStage('T12_ROUTE_ACTIVATION');
  markMatchStartStage('ROUTE_ACTIVATION');
  markMatchStartStage('T13_LIVE_COMPONENT_CREATED');
  markMatchStartStage('LIVE_COMPONENT_CREATED');
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

  // Team names are presentation metadata.  They must not hold the critical
  // start path: fixtures already carry the names required for the first live
  // paint.  The real catalog fills in the map asynchronously afterwards.
  const teamMapForStart$ = teams$.pipe(startWith({} as { [id: string]: string }));

  const careerStatus$ = routeParams$.pipe(
    switchMap((params: any) => {
      const navigationStatus = readRoundStartNavigationState(params.gameId, params.roundNumber);
      const statusSnapshot = ctx.careerService.getCareerStatusSnapshot?.(params.gameId);
      setMatchStartTraceMetadata({
        statusSnapshotAvailableAtClick: !!navigationStatus || !!statusSnapshot,
        statusSnapshotAgeMs: navigationStatus ? 0 : statusSnapshot ? Math.max(0, Date.now() - statusSnapshot.receivedAt) : null,
        statusHttpTriggeredByClick: false
      });
      if (navigationStatus) {
        // The squad screen already received and validated this snapshot. Do
        // not repeat the same Redis read during the critical start path.
        markMatchStartStage('T3_STATUS_REQUESTED');
        markMatchStartStage('T4_STATUS_COMPLETED');
        return of(navigationStatus);
      }
      markMatchStartStage('T3_STATUS_REQUESTED');
      return ctx.careerService.getCareerStatus().pipe(
        tap(() => markMatchStartStage('T4_STATUS_COMPLETED')),
        catchError((err: unknown) => {
          ctx.logDevWarn?.('[ROUND] Status refresh deferred:', err);
          ctx.loadingSubject.next(false);
          return of(null);
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  // Status is useful for labels and manager-team highlighting, but it is not
  // allowed to hold the fixture -> start POST path. It runs in parallel and
  // patches the view model when it completes.
  careerStatus$.pipe(takeUntil(ctx.destroy$)).subscribe((status: any) => {
    if (!status) {
      return;
    }
    ctx.currentUserSessionTeamId = status.userSessionTeamId || null;
    const currentVm = ctx.vmSubject.value;
    if (currentVm.matches.length > 0) {
      const matches = currentVm.matches.map((rm: RoundMatchVM) => {
        const homeId = String(rm.match.homeTeamId);
        const awayId = String(rm.match.awayTeamId);
        const isUserMatch = homeId === ctx.currentUserSessionTeamId || awayId === ctx.currentUserSessionTeamId;
        return {
          ...rm,
          isUserMatch,
          userTeamId: isUserMatch ? ctx.currentUserSessionTeamId : undefined
        };
      });
      ctx.updateVm({ ...currentVm, matches });
    }
  });

  const fixtures$ = routeParams$.pipe(
    tap(() => markMatchStartStage('T5_FIXTURES_REQUESTED')),
    switchMap((params: any) => ctx.careerService.getFixturesByRoundWithBye(params.roundNumber)),
    tap(() => markMatchStartStage('T6_FIXTURES_COMPLETED'))
  );

  combineLatest([routeParams$, teamMapForStart$, fixtures$]).pipe(
    takeUntil(ctx.destroy$),
    tap(([params, teamMap, fixturesData]: any[]) => {
      ctx.loadingSubject.next(false);
      if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
        performance.mark('manager.match-start.live.state-ready');
      }

      const navigationStatus = readRoundStartNavigationState(params.gameId, params.roundNumber);
      const userSessionTeamId = navigationStatus?.userSessionTeamId || ctx.currentUserSessionTeamId || '';
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

      // Lineup is already confirmed on the squad screen. The backend remains
      // authoritative during startRound; there is no second lineup read.
      markMatchStartStage('T7_LINEUP_REQUESTED');
      markMatchStartStage('T8_LINEUP_COMPLETED');

      // The first emission starts the round.  A later team-catalog emission
      // only hydrates labels; roundLiveStartRoundEngine guards the duplicate.
      setMatchStartTraceMetadata({
        fixtureSnapshotAvailableAtClick: !!ctx.careerService.getFixtureSnapshot?.(params.roundNumber),
        startPayloadReadyMs: 0,
        statusHttpTriggeredByClick: false
      });
      ctx.startRoundEngine(params.gameId, matches);
      setTimeout(() => {
        markMatchStartStage('T14_FIRST_RENDER');
        markMatchStartStage('LIVE_RENDERED');
      }, 0);
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
