import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GameService } from '../../core/services/game.service';
import { CareerService } from '../../core/services/career.service';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Location } from '@angular/common';

interface Champion {
  teamId: string;
  teamName: string;
  points: number;
  wins: number;
  goalDifference: number;
}

interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

@Component({
  selector: 'app-tournament-champion',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tournament-champion.component.html',
  styleUrls: ['./tournament-champion.component.css']
})
export class TournamentChampionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gameService = inject(GameService);
  private careerService = inject(CareerService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);

  gameId: string = '';
  champion: Champion | null = null;
  standings: Standing[] = [];
  errorMsg: string = '';
  isCareerMode: boolean = false;
  careerPhase: string = ''; // Para usar directamente en template

  ngOnInit() {
    const gameIdParam = this.route.snapshot.paramMap.get('gameId');
    this.gameId = gameIdParam || '';

    this.detectCareerMode();
  }

  private detectCareerMode() {
    this.careerService.getCareerStatus().subscribe({
      next: (status) => {
        console.log('[TournamentChampion] Career status:', JSON.stringify(status));
        
        // Guardar careerPhase para usar en template
        this.careerPhase = status.careerPhase || '';
        console.log('[TournamentChampion] careerPhase:', this.careerPhase);
        
        // Solo es modo career si hay un careerId válido
        if (status && status.careerId) {
          this.isCareerMode = true;
          console.log('[TournamentChampion] ✅ Modo Career activado');
          this.loadChampionFromCareer();
          this.loadStandingsFromCareer();
        } else {
          this.isCareerMode = false;
          console.log('[TournamentChampion] ❌ No hay carrera activa');
          this.loadChampion();
          this.loadStandings();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[TournamentChampion] ❌ Error detectando career mode:', err);
        this.isCareerMode = false;
        this.careerPhase = '';
        this.loadChampion();
        this.loadStandings();
        this.cdr.markForCheck();
      }
    });
  }

  private loadChampionFromCareer() {
    this.careerService.getChampion().subscribe({
      next: (champion) => {
        this.champion = champion;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMsg = 'Error al cargar el campeón';
        console.error('[TournamentChampion] Error loading champion from Career:', err);
        this.cdr.markForCheck();
      }
    });
  }

  private loadStandingsFromCareer() {
    this.careerService.getStandings().subscribe({
      next: (standings) => {
        this.standings = standings;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[TournamentChampion] Error loading standings from Career:', err);
        this.cdr.markForCheck();
      }
    });
  }

  loadChampion() {
    this.gameService.getChampion(this.gameId).subscribe({
      next: (champion) => {
        this.champion = champion;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMsg = 'Error al cargar el campeón';
        console.error('[TournamentChampion] Error loading champion:', err);
        this.cdr.markForCheck();
      }
    });
  }

  loadStandings() {
    this.gameService.getStandings(this.gameId).subscribe({
      next: (standings) => {
        this.standings = standings;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('[TournamentChampion] Error loading final standings:', err);
        this.cdr.markForCheck();
      }
    });
  }

  backToGame() {
    this.router.navigate([`/games/${this.gameId}`]);
  }

  backToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  continueToNewSeason() {
    if (!confirm('¿Iniciar una nueva temporada con tu equipo actual?')) {
      return;
    }

    this.careerService.continueToNewSeason().subscribe({
      next: (response) => {
        if (response.success) {
          // Usar Location.reload() para forzar recarga completa de la página
          window.location.href = '/squad';
        } else {
          alert('Error: ' + response.message);
        }
      },
      error: (err) => {
        console.error('[TournamentChampion] Error iniciando nueva temporada:', err);
        alert(err.error?.message || 'Error al iniciar nueva temporada');
      }
    });
  }
}
