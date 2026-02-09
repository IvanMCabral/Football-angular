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
import { PlayRoundComponent } from './play-round.component';

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
    
    // Obtener la primera jornada y simular todos los partidos
    this.matchService.getMatchesByGameId(gameId).subscribe(matches => {
      if (matches && matches.length > 0) {
        // Ordenar por round y obtener el primer round
        const sortedMatches = matches.sort((a, b) => (a.round || 0) - (b.round || 0));
        const firstRound = sortedMatches[0].round || 1;
        
        // Navegar a la vista de jornada completa en vivo
        this.router.navigate([`/games/${gameId}/round/${firstRound}/live`]);
      } else {
        alert('No hay partidos disponibles. Genera un fixture primero.');
      }
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.gameService.getGameById(id).subscribe({
        next: (game) => {
          console.log('[GAME DETAIL] Loaded game:', game);
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
