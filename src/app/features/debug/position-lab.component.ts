import { Component, ViewContainerRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ALL_FORMATIONS } from '../../shared/constants/formations';
import { TACTICAL_LAYOUTS } from '../../shared/constants/tactical-layouts';
import { SessionPlayer } from '../../shared/models/player.model';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { PartidoModalComponent, PartidoDialogData } from '../games/components/partido-modal/partido-modal.component';
import { FormationModalComponent } from '../games/components/formation-modal/formation-modal.component';

/** Local visual fixtures only. No match commands leave this component's injector. */
class VisualPositionEngine {
  saved: unknown = null;
  changeFormation(matchId: string, slots: unknown, formation: string) {
    this.saved = { matchId, slots, formation };
    return of({ success: true, minuteApplied: 35 });
  }
  substitutePlayer() { return of({ success: true, minuteApplied: 35 }); }
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  providers: [{ provide: MatchEngineService, useClass: VisualPositionEngine }],
  template: `
    <main class="position-lab">
      <h1>Laboratorio de posiciones</h1>
      <p>Prueba visual local con jugadores ficticios. No modifica carreras ni envía órdenes de partido.</p>
      <p>Las fichas representan posiciones tácticas: arco propio abajo y ataque hacia arriba.</p>
      <label>Formación <select [ngModel]="formation()" (ngModelChange)="formation.set($event)">
        <option *ngFor="let code of formations" [value]="code">{{code}}</option>
      </select></label>
      <label>Situación <select [ngModel]="scenario()" (ngModelChange)="scenario.set($event)">
        <option value="base">Equipo completo</option><option value="manual">Coordenadas manuales</option><option value="red">Una expulsión</option>
      </select></label>
      <button (click)="open(false)">Abrir previa táctica</button>
      <button (click)="open(true)">Abrir DT en vivo · 35'</button>
      <p role="status">{{notice()}}</p>
      <div class="lab-pitch" aria-label="Posiciones del catálogo">
        <span *ngFor="let slot of layout(); let i = index" class="lab-player"
              [style.left.%]="slot.x" [style.top.%]="slot.y">{{i + 1}} · {{slot.role}}</span>
      </div>
      <table><thead><tr><th>Posición</th><th>Rol</th><th>X</th><th>Y</th></tr></thead>
        <tbody><tr *ngFor="let slot of layout(); let i = index"><td>{{i+1}}</td><td>{{slot.role}}</td><td>{{slot.x}}</td><td>{{slot.y}}</td></tr></tbody>
      </table>
    </main>`,
  styles: [`
    .position-lab{max-width:1100px;margin:auto;padding:24px;color:#172554;background:#f8fafc}
    label,button{display:inline-block;margin:8px;padding:10px} select{padding:8px}
    .lab-pitch{position:relative;width:min(100%,650px);height:550px;background:#166534;border:2px solid white;border-radius:12px}
    .lab-player{position:absolute;transform:translate(-50%,-50%);width:10%;text-align:center;background:#fff;border-radius:6px;padding:5px 0;font-size:11px}
    table{margin-top:20px;border-collapse:collapse}th,td{padding:8px 18px;border-bottom:1px solid #cbd5e1}
  `]
})
export class PositionLabComponent {
  readonly formations = ALL_FORMATIONS;
  readonly formation = signal<string>('4-4-2');
  readonly scenario = signal<string>('base');
  readonly notice = signal('Elegí una formación y compará ambos editores.');
  private readonly dialog = inject(MatDialog);
  private readonly viewContainerRef = inject(ViewContainerRef);
  layout() { return TACTICAL_LAYOUTS[this.formation()]; }
  open(live: boolean): void {
    const formation = this.formation();
    const starters = this.layout().map((slot, index) => ({
      sessionPlayerId: 'visual-player-' + index, name: 'Jugador ' + (index + 1),
      position: slot.role, energy: 100, overall: 75, injured: false, suspended: false
    } as SessionPlayer));
    const bench = ['CB', 'CM', 'ST', 'LW', 'RW', 'GK'].map((position, index) => ({
      ...starters[0], sessionPlayerId: 'visual-bench-' + index, name: 'Suplente ' + (index + 1), position
    }));
    const data: PartidoDialogData = {
      matchId: 'local-visual-position-lab', currentFormation: formation,
      homeTeamId: 'visual-home', awayTeamId: 'visual-away', rivalFormation: formation,
      currentSlots: starters.map((p, index) => ({ sessionPlayerId: p.sessionPlayerId, position: p.position,
        slotIndex: index, customXPercent: this.layout()[index].x, customYPercent: this.layout()[index].y })),
      squad: [...starters, ...bench], startingIds: new Set(starters.map(p => p.sessionPlayerId)),
      currentMinute: live ? 35 : 0, events: [], score: {home: 0, away: 0}
    };
    if (this.scenario() === 'manual') {
      data.currentSlots[6] = {...data.currentSlots[6], customXPercent: 72.25, customYPercent: 44.5};
    }
    if (this.scenario() === 'red') {
      data.currentSlots = data.currentSlots.filter(s => s.slotIndex !== 3);
      data.vacantSlotIndexes = [3];
      data.squad = data.squad.filter(p => p.sessionPlayerId !== 'visual-player-3');
    }
    const options = { data, viewContainerRef: this.viewContainerRef, width: '1400px', maxWidth: '96vw', maxHeight: '96vh' };
    const ref = live ? this.dialog.open(PartidoModalComponent, options) : this.dialog.open(FormationModalComponent, options);
    ref.afterClosed().subscribe(result => this.notice.set(result?.success
      ? 'Cambio visual registrado localmente. No se modificó ninguna carrera.' : 'Editor cerrado sin aplicar cambios.'));
  }
}
