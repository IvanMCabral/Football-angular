import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RosterPlayer {
  sessionPlayerId: string; name: string; position: string; age: number;
  overall?: number; energy?: number; form?: number; marketValue?: number;
  attack?: number; defense?: number; technique?: number; speed?: number; stamina?: number; mentality?: number;
  injured?: boolean; injuryRemainingMatches?: number; suspended?: boolean; suspensionRemainingMatches?: number;
  specialTraits?: { code: string; name: string }[];
}

@Component({
  selector: 'app-roster-table', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './roster-table.component.html', styleUrl: './roster-table.component.css'
})
export class RosterTableComponent {
  @Input() players: readonly RosterPlayer[] = [];
  query = ''; position = ''; availability = ''; sortBy = 'position'; expandedId: string | null = null;
  get positions(): string[] { return [...new Set(this.players.map(p => p.position))].sort(); }
  available(player: RosterPlayer): boolean {
    return !player.injured && !player.suspended && (player.suspensionRemainingMatches ?? 0) <= 0;
  }
  status(player: RosterPlayer): string {
    if (player.suspended || (player.suspensionRemainingMatches ?? 0) > 0) return 'Suspendido';
    if (player.injured) return 'Lesionado';
    return (player.energy ?? 100) < 40 ? 'Cansado' : 'Disponible';
  }
  get filtered(): RosterPlayer[] {
    const query = this.query.trim().toLocaleLowerCase();
    return this.players.filter(p => (!query || p.name.toLocaleLowerCase().includes(query))
      && (!this.position || p.position === this.position)
      && (!this.availability || (this.availability === 'available' ? this.available(p) : !this.available(p))))
      .slice().sort((a,b) => {
        if (this.sortBy === 'overall') return (b.overall ?? -1) - (a.overall ?? -1) || a.name.localeCompare(b.name);
        if (this.sortBy === 'energy') return (b.energy ?? 100) - (a.energy ?? 100) || a.name.localeCompare(b.name);
        if (this.sortBy === 'age') return a.age - b.age || a.name.localeCompare(b.name);
        if (this.sortBy === 'name') return a.name.localeCompare(b.name);
        return a.position.localeCompare(b.position) || a.name.localeCompare(b.name);
      });
  }
  money(value: number): string { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value); }
}
