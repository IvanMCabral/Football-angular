import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameService } from '../../core/services/game.service';
import { Game } from '../../shared/models/game.model';
import { AuthService } from '../../core/services/auth.service';
import { CareerService } from '../../core/services/career.service';
import { MatchService } from '../../features/matches/services/match.service';
import { DashboardFixtureModalComponent } from '../dashboard/dashboard-fixture-modal.component';
import { DashboardUserInfoComponent } from '../dashboard/dashboard-user-info.component';

@Component({
  selector: 'app-game-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardFixtureModalComponent, DashboardUserInfoComponent],
  templateUrl: './game-detail.component.html',
  styleUrls: ['./game-detail.component.css']
})
export class GameDetailComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  game?: Game;
  username = '';
  teamName = '';
  showFixtureModal = false;
  fixtureMatches: any[] = [];
  teamNameMap: { [id: string]: string } = {};
  errorMsg = '';

  private authService = inject(AuthService);
  private careerService = inject(CareerService);
  private matchService = inject(MatchService);
  private route = inject(ActivatedRoute);
  private gameService = inject(GameService);
  private router = inject(Router);


  getValue(val: any): string {
    if (val && typeof val === 'object' && 'value' in val) {
      return val.value;
    }
    return val ?? '';
  }


  playFirstRound() {
    if (!this.game) return;
    const gameId = this.getValue(this.game.id);

    this.careerService.getCareerStatus().subscribe({
      next: (status) => {
        if (status?.careerPhase === 'FINISHED') {
          this.router.navigate([`/games/${gameId}/champion`]);
          return;
        }

        if (status?.careerPhase === 'PRE_MATCH' || status?.careerPhase === 'LIVE') {
          const round = status.currentRound || 1;
          this.router.navigate([`/games/${gameId}/round/${round}/live`]);
          return;
        }

        if (status?.careerPhase === 'WAITING_USER' && status?.careerId) {
          this.careerService.advanceToNextRound(status.careerId).subscribe({
            next: (response) => {
              if (response?.success && response.currentRound && response.careerPhase === 'PRE_MATCH') {
                this.router.navigate([`/games/${gameId}/round/${response.currentRound}/live`]);
                return;
              }
              if (response?.tournamentFinished) {
                this.router.navigate([`/games/${gameId}/champion`]);
                return;
              }
              this.router.navigate(['/squad']);
            },
            error: (err) => {
              this.errorMsg = err.error?.message || err.message || 'No se pudo avanzar a la siguiente fecha.';
              this.cdr.markForCheck();
            }
          });
          return;
        }

        this.router.navigate(['/squad']);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || err.message || 'No se pudo leer el estado de la carrera.';
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.gameService.getGameById(id).subscribe({
        next: (game) => {
          if (!game) {
            // Defensive: back should now return 404 for missing games, but if
            // a regression sends 200+null we still surface the error state
            // instead of falling into the infinite 'Loading game details...' template.
            this.errorMsg = 'No se encontro el juego. Puede que no exista o no tengas acceso.';
            this.cdr.detectChanges();
            return;
          }
          this.game = game;
          this.cdr.detectChanges();
          // Fetch user info
          this.authService.getUserInfo().subscribe(user => {
            this.username = user.username;
            this.teamName = user.teamName || '';
            this.cdr.detectChanges();
          });
          // Fetch team name map (from CareerSave for fixture modal)
          this.careerService.getCareerTeams(id).subscribe(teams => {
            this.teamNameMap = {};
            teams.forEach(team => {
              const teamId = team.sessionTeamId || this.getValue(team.id);
              this.teamNameMap[teamId] = team.name;
            });
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('[GAME DETAIL] Error loading game:', err);
          this.errorMsg = 'No se pudo cargar el juego. Puede que no exista o hubo un error.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.errorMsg = 'ID de juego inválido.';
      this.cdr.detectChanges();
    }
  }

  openFixtureModal() {
    if (!this.game) return;
    const gameId = this.getValue(this.game.id);
    this.matchService.getMatchesByGameId(gameId).subscribe(matches => {
      this.fixtureMatches = matches;
      this.showFixtureModal = true;
      this.cdr.detectChanges();
    });
  }

  closeFixtureModal() {
    this.showFixtureModal = false;
    this.cdr.detectChanges();
  }
}
