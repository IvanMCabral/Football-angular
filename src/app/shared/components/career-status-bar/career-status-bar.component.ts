import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CareerStatus } from 'app/core/services/career.model';

@Component({
  selector: 'app-career-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './career-status-bar.component.html',
  styleUrl: './career-status-bar.component.css'
})
export class CareerStatusBarComponent {
  @Input() careerStatus: CareerStatus | null = null;

  @Output() fixtureClick = new EventEmitter<void>();
  @Output() standingsClick = new EventEmitter<void>();
  @Output() palmaresClick = new EventEmitter<void>();
  @Output() promotionsClick = new EventEmitter<void>();

  onFixtureClick(): void {
    this.fixtureClick.emit();
  }

  onStandingsClick(): void {
    this.standingsClick.emit();
  }

  onPalmaresClick(): void {
    this.palmaresClick.emit();
  }

  onPromotionsClick(): void {
    this.promotionsClick.emit();
  }

  /**
   * C55.10 Item 4 — tier-real badge helper. Same contract as the dashboard
   * pill ({@link tierCssClass} on {@code DashboardComponent} and
   * {@link StandingsPageComponent}): maps the {@code careerStatus.userDivision}
   * literal label from the back into one of the tier-* CSS classes, with
   * {@code 'tier-default'} as fallback for tiers outside
   * PRIMERA / SEGUNDA / TERCERA.
   */
  tierCssClass(userDivision: string | null | undefined): string {
    if (userDivision === 'PRIMERA') return 'tier-primera';
    if (userDivision === 'SEGUNDA') return 'tier-segunda';
    if (userDivision === 'TERCERA') return 'tier-tercera';
    return 'tier-default';
  }
}
