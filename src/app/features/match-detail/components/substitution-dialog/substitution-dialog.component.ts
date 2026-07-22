import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

/**
 * LIVE-MATCH-F1-POC: minimal substitution dialog.
 *
 * <p>Two columns: "Sale" (radios over starting XI) and "Entra" (radios over bench).
 * Submit is disabled until both selections are made.
 *
 * <p>Phase 1 POC limitation (per F3 in the prompt): this dialog receives a
 * static-ish list of starting/bench players hardcoded in the parent component,
 * NOT a real {@code V24DetailedMatchData.startingPlayers} array. The real
 * lineup data requires a backend DTO extension (deferred to Phase 2).
 */
export interface SubstitutionDialogData {
  matchId: string;
  startingPlayers: Array<{ sessionPlayerId: string; name: string; position: string }>;
  benchPlayers: Array<{ sessionPlayerId: string; name: string; position: string }>;
  substitutionsRemaining: number;
  currentMinute: number;
}

export interface SubstitutionDialogResult {
  playerOffId: string;
  playerOnId: string;
  minute: number;
}

@Component({
  selector: 'app-substitution-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatRadioModule],
  template: `
    <h2 mat-dialog-title>
      Sustituir jugador
      <span style="float: right; font-size: 12px; color: #666;">
        Minuto {{ data.currentMinute }} · Te quedan {{ data.substitutionsRemaining }}
      </span>
    </h2>
    <mat-dialog-content>
      <div class="subs-grid">
        <div class="col">
          <h3>Sale</h3>
          <mat-radio-group [(ngModel)]="selectedOffId" aria-label="Jugador que sale">
            <mat-radio-button *ngFor="let p of data.startingPlayers"
                              [value]="p.sessionPlayerId"
                              class="player-radio">
              <span class="player-name">{{ p.name }}</span>
              <span class="player-pos">{{ p.position }}</span>
            </mat-radio-button>
          </mat-radio-group>
        </div>
        <div class="col">
          <h3>Entra</h3>
          <mat-radio-group [(ngModel)]="selectedOnId" aria-label="Jugador que entra">
            <mat-radio-button *ngFor="let p of data.benchPlayers"
                              [value]="p.sessionPlayerId"
                              class="player-radio">
              <span class="player-name">{{ p.name }}</span>
              <span class="player-pos">{{ p.position }}</span>
            </mat-radio-button>
          </mat-radio-group>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()" aria-label="Cancelar sustitución">Cancelar</button>
      <button mat-raised-button color="primary"
              [disabled]="!canSubmit()"
              (click)="confirm()"
              aria-label="Confirmar sustitución">
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .subs-grid { display: flex; gap: 24px; min-width: 480px; }
    .col { flex: 1; }
    .col h3 { margin: 0 0 8px; font-size: 14px; color: #555; text-transform: uppercase; letter-spacing: 0.4px; }
    .player-radio { display: block; padding: 4px 0; }
    .player-name { font-weight: 500; }
    .player-pos { margin-left: 8px; color: #888; font-size: 12px; }
    mat-radio-group { display: flex; flex-direction: column; }
  `]
})
export class SubstitutionDialogComponent {
  selectedOffId: string | null = null;
  selectedOnId: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<SubstitutionDialogComponent, SubstitutionDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: SubstitutionDialogData
  ) {}

  canSubmit(): boolean {
    return !!this.selectedOffId && !!this.selectedOnId && this.data.substitutionsRemaining > 0;
  }

  confirm(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.dialogRef.close({
      playerOffId: this.selectedOffId!,
      playerOnId: this.selectedOnId!,
      minute: this.data.currentMinute,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
