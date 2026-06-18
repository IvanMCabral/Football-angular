import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { TeamListComponent } from './features/teams/team-list/team-list.component';
import { TeamDetailComponent } from './features/teams/team-detail/team-detail.component';
import { TeamCreateComponent } from './features/teams/team-create/team-create.component';
import { TeamManagementComponent } from './features/teams/team-management/team-management.component';
import { ChooseTeamComponent } from './features/teams/choose-team.component';
import { PlayerCreateComponent } from './features/players/player-create/player-create.component';
import { PlayerManagementComponent } from './features/players/player-management/player-management.component';
import { SquadManagementComponent } from './features/players/squad-management/squad-management.component';
import { CareerSetupComponent } from './features/career/career-setup.component';

import { MatchListComponent } from './features/matches/match-list/match-list.component';
import { MatchDetailComponent } from './features/matches/match-detail/match-detail.component';
import { MatchCreateComponent } from './features/matches/match-create/match-create.component';
import { V24MatchDetailPageComponent } from './features/match-detail/pages/v24-match-detail-page.component';
import { MatchComparePageComponent } from './features/match-detail/pages/match-compare-page.component';

import { GameDetailComponent } from './features/games/game-detail.component';
import { PlayRoundComponent } from './features/games/play-round.component';
import { MatchLiveComponent } from './features/games/match-live.component';
import { RoundLiveComponent } from './features/games/round-live.component';
import { RoundSummaryComponent } from './features/games/round-summary.component';
import { TournamentChampionComponent } from './features/games/tournament-champion.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'career/setup', component: CareerSetupComponent, canActivate: [authGuard] },
  { path: 'teams', component: TeamListComponent, canActivate: [authGuard] },
  { path: 'teams/create', component: TeamCreateComponent, canActivate: [authGuard] },
  { path: 'teams/manage', component: TeamManagementComponent, canActivate: [authGuard] },
  { path: 'teams/:id', component: TeamDetailComponent, canActivate: [authGuard] },
  { path: 'choose-team', component: ChooseTeamComponent, canActivate: [authGuard] },
  { path: 'players/create', component: PlayerCreateComponent, canActivate: [authGuard] },
  { path: 'players/manage', component: PlayerManagementComponent, canActivate: [authGuard] },
  { path: 'squad', component: SquadManagementComponent, canActivate: [authGuard] },
  { path: 'matches', component: MatchListComponent, canActivate: [authGuard] },
  { path: 'matches/create', component: MatchCreateComponent, canActivate: [authGuard] },
  { path: 'matches/:id', component: MatchDetailComponent, canActivate: [authGuard] },
  { path: 'careers/:careerId/matches/:matchId/detail', component: V24MatchDetailPageComponent, canActivate: [authGuard] },
  // F6 Sprint 2 (LIVE-MATCH-F6-MATCH-COMPARE): baseline vs live comparison page
  { path: 'careers/:careerId/matches/:matchId/compare', component: MatchComparePageComponent, canActivate: [authGuard] },
  { path: 'games/:id', component: GameDetailComponent, canActivate: [authGuard] },
  { path: 'games/:gameId/round/:round/live', component: RoundLiveComponent, canActivate: [authGuard] },
  { path: 'games/:gameId/round/:round/summary', component: RoundSummaryComponent, canActivate: [authGuard] },
  { path: 'games/:gameId/champion', component: TournamentChampionComponent, canActivate: [authGuard] },
  { path: 'games/:gameId/match/:matchId/live', component: MatchLiveComponent, canActivate: [authGuard] },
  { path: 'games/:id/play-round', component: PlayRoundComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/dashboard' }
];

