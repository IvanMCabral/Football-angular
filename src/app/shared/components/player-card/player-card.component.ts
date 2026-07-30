import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerCardData } from './player-card.model';

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.css'
})
export class PlayerCardComponent {
  @Input() player!: PlayerCardData;
  @Input() isSquad: boolean = false;

  /**
   * Optional current round. When provided, injury details show the expected
   * return round; otherwise the card falls back to a relative absence label.
   */
  @Input() currentRound: number | null = null;

  isSuspended(): boolean {
    return this.player.suspended === true || (this.player.suspensionRemainingMatches ?? 0) > 0;
  }

  suspendedLabel(): string {
    return 'Suspendido';
  }

  suspendedDetail(): string {
    const remaining = this.player.suspensionRemainingMatches ?? 0;
    if (remaining > 0) {
      return remaining === 1 ? 'No disponible por 1 partido' : `No disponible por ${remaining} partidos`;
    }
    return 'No disponible';
  }

  suspendedTooltip(): string {
    const remaining = this.player.suspensionRemainingMatches ?? 0;
    if (remaining > 0) {
      return `El jugador está suspendido por ${remaining} partido(s) y no puede ser seleccionado`;
    }
    return 'El jugador está suspendido y no puede ser seleccionado';
  }

  isInjured(): boolean {
    return this.player.injured === true && !this.isSuspended();
  }

  injuryLabel(): string {
    if (this.player.injured !== true) { return ''; }
    const remaining = this.player.injuryRemainingMatches;
    if (remaining === null || remaining === undefined || remaining <= 0) {
      return 'Lesionado';
    }
    return remaining === 1 ? 'Vuelve pronto' : 'Lesionado';
  }

  injuryDetail(): string {
    if (this.player.injured !== true) { return ''; }
    const remaining = this.player.injuryRemainingMatches;
    if (remaining === null || remaining === undefined || remaining <= 0) {
      return 'No disponible';
    }
    const returnRound = this.computeReturnRound(remaining);
    const baseText = remaining === 1 ? 'Fuera 1 partido' : `Fuera ${remaining} partidos`;
    return returnRound !== null ? `${baseText} · Vuelve en fecha ${returnRound}` : baseText;
  }

  /**
   * Computes the absolute round number when the player is expected to return.
   */
  private computeReturnRound(remaining: number): number | null {
    if (this.currentRound === null || this.currentRound === undefined) return null;
    if (!Number.isFinite(this.currentRound) || this.currentRound < 1) return null;
    return this.currentRound + remaining;
  }

  injuryTooltip(): string {
    if (this.player.injured !== true) { return ''; }
    const label = this.injuryLabel();
    const detail = this.injuryDetail();
    if (this.player.injuryType) {
      return `${label}: ${this.player.injuryType} — ${detail}`;
    }
    return `${label} — ${detail}`;
  }

  energyStatus(): 'fresh' | 'good' | 'tired' | 'very-tired' | 'exhausted' {
    const e = this.clampEnergy(this.player.energy ?? 100);
    if (e >= 80) { return 'fresh'; }
    if (e >= 60) { return 'good'; }
    if (e >= 40) { return 'tired'; }
    if (e >= 20) { return 'very-tired'; }
    return 'exhausted';
  }

  energyLabel(): string {
    const labels: Record<string, string> = {
      'fresh': 'Fresco',
      'good': 'Bien',
      'tired': 'Cansado',
      'very-tired': 'Muy cansado',
      'exhausted': 'Agotado'
    };
    return labels[this.energyStatus()] ?? '';
  }

  energyTooltip(): string {
    return `Energía: ${this.energyPercent()}% — ${this.energyLabel()}`;
  }

  energyPercent(): number {
    return this.clampEnergy(this.player.energy ?? 100);
  }

  hasSpecialTraits(): boolean {
    return (this.player.specialTraits?.length ?? 0) > 0;
  }

  private clampEnergy(value: number | undefined | null): number {
    if (value === null || value === undefined) { return 100; }
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
