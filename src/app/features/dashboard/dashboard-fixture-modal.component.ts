import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Match } from '../../shared/models/match.model';

@Component({
  selector: 'app-dashboard-fixture-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-fixture-modal.component.html',
  styleUrls: ['./dashboard-fixture-modal.component.css']
})
export class DashboardFixtureModalComponent {
  private router = inject(Router);
  private _matches: Match[] = [];
  
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
}
