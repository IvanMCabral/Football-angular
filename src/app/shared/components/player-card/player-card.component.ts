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
}
