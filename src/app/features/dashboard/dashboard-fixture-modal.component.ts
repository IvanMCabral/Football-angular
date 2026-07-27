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

type FixtureMatch = Fixture | Match;
type MatchIdValue = string | number | { value?: string | number | null } | null | undefined;

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

  getValue(val: MatchIdValue): string {
    if (val && typeof val === 'object' && 'value' in val) {
      return String(val.value ?? '');
    }
    return String(val ?? '');
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

  playLive(match: FixtureMatch): void {
    if (!this.gameId) {
      return;
    }
    const matchId = this.getMatchId(match);
    this.router.navigate([`/games/${this.gameId}/match/${matchId}/live`]);
    this.close();
  }

  getRounds(matches: Match[]): number[] {
    const rounds = Array
      .from(new Set(matches.map(m => m.round).filter((round): round is number => typeof round === 'number')))
      .sort((a, b) => a - b);
    return rounds;
  }

  getMatchesForRound(round: number): Match[] {
    const filtered = this.matches.filter((m) => m.round === round);
    return filtered;
  }

  goToMatchDetail(match: FixtureMatch): void {
    if (!this._careerId) {
      return;
    }
    const matchId = this.getMatchId(match);
    this.router.navigate(['/careers', this._careerId, 'matches', matchId, 'detail']);
    this.close();
  }

  canShowDetail(match: FixtureMatch): boolean {
    return (match.status === 'COMPLETED' || match.status === 'SIMULATED') && !!this._careerId;
  }

  private getMatchId(match: FixtureMatch): string {
    return this.getValue('matchId' in match ? match.matchId : match.id);
  }
}
