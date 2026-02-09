import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-user-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-user-info.component.html',
  styleUrls: ['./dashboard-user-info.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardUserInfoComponent {
  @Input() username: string = '';
  @Input() teamName?: string;
}
