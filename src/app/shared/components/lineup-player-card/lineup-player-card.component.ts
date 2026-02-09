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
}
