import { Component, Input, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Match } from '../../shared/models/match.model';
import { CareerService } from '../../core/services/career.service';
import { Fixture } from '../../core/services/career.model';

interface RoundFixturesWithBye {
  round: number;
  matches: Fixture[];
  byeTeam: string | null;
}

interface AllRoundsWithBye {
  rounds: RoundFixturesWithBye[];
}

@Component({
  selector: 'app-dashboard-fixture-modal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-fixture-modal.component.html',
  styleUrls: ['./dashboard-fixture-modal.component.css']
})
export class DashboardFixtureModalComponent implements OnInit {
  private router = inject(Router);
  private careerService = inject(CareerService);
  private _matches: Match[] = [];
  private _careerId: string | null = null;
  rounds: RoundFixturesWithBye[] = [];
  loading = true;

  get careerId(): string | null {
    return this._careerId;
  }
  
  @Input() set matches(val: Match[]) {
    this._matches = val;
  }
  get matches(): Match[] {
    return this._matches;
  }

  @Input() close!: () => void;
  @Input() teamNameMap: { [id: string]: string } = {};
  @Input() gameId?: string;

  getValue(val: any): string {
    if (val && typeof val === 'object' && 'value' in val) {
      return val.value;
    }
    return val ?? '';
  }

  ngOnInit(): void {
    this.loadFixturesWithBye();
  }

  loadFixturesWithBye(): void {
    this.loading = true;
    this.careerService.getAllFixturesWithBye().subscribe({
      next: (data: AllRoundsWithBye) => {
        this.rounds = data.rounds || [];
        this.loading = false;
      },
      error: () => {
        this.rounds = [];
        this.loading = false;
      }
    });

    this.careerService.getCareerStatus().subscribe({
      next: (status) => {
        this._careerId = status.careerId;
      },
      error: () => {
        this._careerId = null;
      }
    });
  }

  playLive(match: any) {
    if (!this.gameId) {
      return;
    }
    // UX-6: handle both Fixture (matchId) and legacy Match (id)
    const matchId = this.getValue(match.matchId || match.id);
    this.router.navigate([`/games/${this.gameId}/match/${matchId}/live`]);
    this.close();
  }

  getRounds(matches: any[]): number[] {
    const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);
    return rounds;
  }

  getMatchesForRound(round: number): any[] {
    const filtered = this.matches.filter((m: any) => m.round === round);
    return filtered;
  }

  goToMatchDetail(match: any): void {
    if (!this._careerId) {
      return;
    }
    // UX-6: handle both Fixture (matchId) and legacy Match (id)
    const matchId = this.getValue(match.matchId || match.id);
    this.router.navigate(['/careers', this._careerId, 'matches', matchId, 'detail']);
    this.close();
  }

  canShowDetail(match: any): boolean {
    return match.status === 'COMPLETED' && !!this._careerId;
  }
}
