import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Match } from '../../shared/models/match.model';
import { CareerService } from '../../core/services/career.service';

@Component({
  selector: 'app-dashboard-fixture-modal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-fixture-modal.component.html',
  styleUrls: ['./dashboard-fixture-modal.component.css']
})
export class DashboardFixtureModalComponent {
  private router = inject(Router);
  private careerService = inject(CareerService);
  private _matches: Match[] = [];
  private _careerId: string | null = null;

  get careerId(): string | null {
    return this._careerId;
  }
  
  @Input() set matches(val: Match[]) {
    this._matches = val;
    console.log('[MODAL] matches recibidos:', this._matches);
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

  playLive(match: Match) {
    if (!this.gameId) {
      console.error('[MODAL] No se especificó gameId');
      return;
    }
    const matchId = this.getValue(match.id);
    this.router.navigate([`/games/${this.gameId}/match/${matchId}/live`]);
    this.close();
  }

  getRounds(matches: any[]): number[] {
    const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);
    console.log('[MODAL] Rounds calculados:', rounds);
    return rounds;
  }

  getMatchesForRound(round: number): any[] {
    const filtered = this.matches.filter((m: any) => m.round === round);
    console.log(`[MODAL] Matches para round ${round}:`, filtered);
    return filtered;
  }

  ngOnInit(): void {
    this.careerService.getCareerStatus().subscribe({
      next: (status) => {
        this._careerId = status.careerId;
      },
      error: () => {
        this._careerId = null;
      }
    });
  }

  goToMatchDetail(match: Match): void {
    if (!this._careerId) {
      console.error('[MODAL] careerId not available');
      return;
    }
    const matchId = this.getValue(match.id);
    this.router.navigate(['/careers', this._careerId, 'matches', matchId, 'detail']);
    this.close();
  }

  canShowDetail(match: Match): boolean {
    return (match.status as string) === 'COMPLETED' && !!this._careerId;
  }
}
