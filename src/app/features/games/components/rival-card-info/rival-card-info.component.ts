import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/**
 * V25D81.1 BUG #3: rival RED_CARD awareness modal.
 *
 * <p>When the rival receives a red card, the manager gets a small
 * informational dialog so they know their opponent is down a man —
 * but the modal does NOT trigger any automatic substitution action.
 * Closing the dialog (the only action) returns the manager to the
 * live-match view unchanged.
 *
 * <p>The dialog intentionally has no "Cerrar y sustituir" button. Quick
 * squad changes after a rival sending-off still go through the
 * existing "Sustituir" button, not this awareness flow.
 *
 * <p>Rendered inline-styled (no {@code styleUrls}) so Karma/jsdom tests
 * can parse the styles via {@code ɵcmp.styles} (see the angular-testing
 * patterns memory note for the rationale).
 */
export interface RivalCardInfoDialogData {
  /** Display name of the rival player who received the card. */
  playerName: string;
  /** Match minute the card was issued. */
  minute: number;
  /** Card kind — currently always 'RED' (YELLOW cards don't trigger the modal). */
  cardType: 'RED';
  /** Optional short id used to scope dedup across SSE reconnects. */
  eventId?: string;
}

@Component({
  selector: 'app-rival-card-info',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="rival-card-info-title">
      <span class="rival-card-info-icon">🚨</span>
      Tarjeta roja para el rival
    </h2>
    <mat-dialog-content class="rival-card-info-content">
      <p>
        <strong>{{ data.playerName }}</strong> recibió tarjeta roja en el minuto
        <strong>{{ data.minute }}</strong>.
      </p>
      <p class="rival-card-info-hint">
        Jugarán con uno menos durante el resto del partido. La decisión de
        ajustar tu formación o no sigue siendo tuya — abrí "Sustituir" si
        querés mover piezas.
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="rival-card-info-actions">
      <button
        mat-flat-button
        color="primary"
        type="button"
        class="rival-card-info-close"
        (click)="onClose()">
        Cerrar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      max-width: 420px;
    }
    .rival-card-info-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
    }
    .rival-card-info-icon {
      font-size: 1.6rem;
      line-height: 1;
    }
    .rival-card-info-content p {
      margin: 0 0 0.75rem 0;
      line-height: 1.4;
    }
    .rival-card-info-hint {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
    }
    .rival-card-info-actions {
      padding: 0.5rem 1rem 1rem;
    }
  `]
})
export class RivalCardInfoComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RivalCardInfoDialogData,
    private dialogRef: MatDialogRef<RivalCardInfoComponent>
  ) {}

  onClose(): void {
    this.dialogRef.close({ dismissed: true });
  }
}
