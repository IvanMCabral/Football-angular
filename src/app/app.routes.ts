import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { environment } from './environments/environment';
import { buildDebugRoutes } from './app.debug-routes';

const guarded = [authGuard];
const debugRoutes: Routes = buildDebugRoutes(environment.enableDebugRoutes, guarded);

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component')
      .then((m) => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then((m) => m.DashboardComponent),
    canActivate: guarded,
  },
  {
    path: 'career/setup',
    loadComponent: () => import('./features/career/career-setup.component')
      .then((m) => m.CareerSetupComponent),
    canActivate: guarded,
  },
  {
    path: 'teams',
    loadComponent: () => import('./features/teams/team-list/team-list.component')
      .then((m) => m.TeamListComponent),
    canActivate: guarded,
  },
  {
    path: 'teams/create',
    loadComponent: () => import('./features/teams/team-create/team-create.component')
      .then((m) => m.TeamCreateComponent),
    canActivate: guarded,
  },
  {
    path: 'teams/manage',
    loadComponent: () => import('./features/teams/team-management/team-management.component')
      .then((m) => m.TeamManagementComponent),
    canActivate: guarded,
  },
  {
    path: 'teams/:id',
    loadComponent: () => import('./features/teams/team-detail/team-detail.component')
      .then((m) => m.TeamDetailComponent),
    canActivate: guarded,
  },
  {
    path: 'choose-team',
    loadComponent: () => import('./features/teams/choose-team.component')
      .then((m) => m.ChooseTeamComponent),
    canActivate: guarded,
  },
  {
    path: 'players/create',
    loadComponent: () => import('./features/players/player-create/player-create.component')
      .then((m) => m.PlayerCreateComponent),
    canActivate: guarded,
  },
  {
    path: 'players/manage',
    loadComponent: () => import('./features/players/player-management/player-management.component')
      .then((m) => m.PlayerManagementComponent),
    canActivate: guarded,
  },
  {
    path: 'squad',
    loadComponent: () => import('./features/players/squad-management/squad-management.component')
      .then((m) => m.SquadManagementComponent),
    canActivate: guarded,
  },
  {
    path: 'standings',
    loadComponent: () => import('./pages/standings/standings-page.component')
      .then((m) => m.StandingsPageComponent),
    canActivate: guarded,
  },
  {
    path: 'matches',
    loadComponent: () => import('./features/matches/match-list/match-list.component')
      .then((m) => m.MatchListComponent),
    canActivate: guarded,
  },
  {
    path: 'matches/create',
    loadComponent: () => import('./features/matches/match-create/match-create.component')
      .then((m) => m.MatchCreateComponent),
    canActivate: guarded,
  },
  {
    path: 'matches/:id',
    loadComponent: () => import('./features/matches/match-detail/match-detail.component')
      .then((m) => m.MatchDetailComponent),
    canActivate: guarded,
  },
  {
    path: 'careers/:careerId/matches/:matchId/detail',
    loadComponent: () => import('./features/match-detail/pages/detailed-match-page.component')
      .then((m) => m.DetailedMatchPageComponent),
    canActivate: guarded,
  },
  {
    path: 'careers/:careerId/matches/:matchId/compare',
    loadComponent: () => import('./features/match-detail/pages/match-compare-page.component')
      .then((m) => m.MatchComparePageComponent),
    canActivate: guarded,
  },
  ...debugRoutes,
  {
    path: 'games/:id',
    loadComponent: () => import('./features/games/game-detail.component')
      .then((m) => m.GameDetailComponent),
    canActivate: guarded,
  },
  {
    path: 'games/:gameId/round/:round/live',
    loadComponent: () => import('./features/games/round-live.component')
      .then((m) => m.RoundLiveComponent),
    canActivate: guarded,
  },
  {
    path: 'games/:gameId/round/:round/summary',
    loadComponent: () => import('./features/games/round-summary.component')
      .then((m) => m.RoundSummaryComponent),
    canActivate: guarded,
  },
  {
    path: 'games/:gameId/champion',
    loadComponent: () => import('./features/games/tournament-champion.component')
      .then((m) => m.TournamentChampionComponent),
    canActivate: guarded,
  },
  {
    path: 'games/:gameId/match/:matchId/live',
    loadComponent: () => import('./features/games/match-live.component')
      .then((m) => m.MatchLiveComponent),
    canActivate: guarded,
  },
  {
    path: 'games/:id/play-round',
    loadComponent: () => import('./features/games/play-round.component')
      .then((m) => m.PlayRoundComponent),
    canActivate: guarded,
  },
  { path: '**', redirectTo: '/dashboard' },
];
