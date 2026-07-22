import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LineupPlayerData } from './lineup-player-card.model';

@Component({
  selector: 'app-lineup-player-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lineup-player-card.component.html',
  styleUrl: './lineup-player-card.component.css'
})
export class LineupPlayerCardComponent {
  @Input() player!: LineupPlayerData;

  isSuspended(): boolean {
    return this.player.suspended === true || (this.player.suspensionRemainingMatches ?? 0) > 0;
  }

  isInjured(): boolean {
    return this.player.injured === true && !this.isSuspended();
  }

  energyPercent(): number {
    return this.clampEnergy(this.player.energy ?? 100);
  }

  isExhausted(): boolean {
    return this.energyPercent() <= 19;
  }

  isVeryTired(): boolean {
    const e = this.energyPercent();
    return e >= 20 && e <= 39;
  }

  isTired(): boolean {
    const e = this.energyPercent();
    return e >= 40 && e <= 59;
  }

  conditionWarningLabel(): string {
    if (this.isSuspended()) { return 'Suspendido'; }
    if (this.isInjured()) { return 'Lesionado'; }
    if (this.isExhausted()) { return 'Agotado'; }
    if (this.isVeryTired()) { return 'Muy cansado'; }
    if (this.isTired()) { return 'Cansado'; }
    return '';
  }

  conditionWarningTooltip(): string {
    if (this.isSuspended()) {
      const remaining = this.player.suspensionRemainingMatches ?? 0;
      if (remaining > 0) {
        return `Este jugador está suspendido por ${remaining} partido(s).`;
      }
      return 'Este jugador está suspendido y no puede ser seleccionado.';
    }
    if (this.isInjured()) {
      return 'Este jugador está lesionado. Conviene reemplazarlo antes de confirmar la formación.';
    }
    if (this.isExhausted()) {
      return 'Este jugador está agotado. Ponerlo de titular puede afectar su rendimiento.';
    }
    if (this.isVeryTired()) {
      return 'Este jugador está muy cansado. Conviene darle descanso.';
    }
    if (this.isTired()) {
      return 'Este jugador tiene energía reducida.';
    }
    return '';
  }

  conditionClass(): string {
    if (this.isSuspended()) { return 'condition-suspended'; }
    if (this.isInjured()) { return 'condition-injured'; }
    if (this.isExhausted()) { return 'condition-exhausted'; }
    if (this.isVeryTired()) { return 'condition-very-tired'; }
    if (this.isTired()) { return 'condition-tired'; }
    return '';
  }

  hasConditionWarning(): boolean {
    return this.isSuspended() || this.isInjured() || this.isExhausted() || this.isVeryTired() || this.isTired();
  }

  private clampEnergy(value: number | undefined | null): number {
    if (value === null || value === undefined) { return 100; }
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
