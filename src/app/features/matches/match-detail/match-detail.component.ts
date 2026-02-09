
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatchMinuteService, MatchMinuteState, MatchEvent } from '../services/match-minute.service';
import { Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './match-detail.component.html',
  styleUrls: ['./match-detail.component.css']
})
export class MatchDetailComponent implements OnInit, OnDestroy {
  loading = false;
  error = '';
  matchId: string | null = null;
  minuteStates: MatchMinuteState[] = [];
  currentState: MatchMinuteState | null = null;
  isFinished = false;
  private timerSub: Subscription | null = null;
  private progressIndex = 0;
  private fetchSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private matchMinuteService: MatchMinuteService
  ) {}

  ngOnInit(): void {
    this.matchId = this.route.snapshot.paramMap.get('id');
    if (!this.matchId) {
      this.error = 'No match ID provided.';
      return;
    }
    this.loading = true;
    this.fetchSub = this.matchMinuteService.getMinuteByMinute(this.matchId).subscribe({
      next: (states) => {
        this.minuteStates = states;
        this.loading = false;
        this.startAnimation();
      },
      error: (err) => {
        this.error = 'Failed to load match progress.';
        this.loading = false;
      }
    });
  }

  startAnimation(): void {
    this.progressIndex = 0;
    this.isFinished = false;
    if (this.timerSub) this.timerSub.unsubscribe();
    if (!this.minuteStates.length) return;
    this.currentState = this.minuteStates[0];
    this.timerSub = timer(0, 700).subscribe(() => {
      if (this.progressIndex < this.minuteStates.length) {
        this.currentState = this.minuteStates[this.progressIndex];
        this.progressIndex++;
      } else {
        this.isFinished = true;
        if (this.timerSub) this.timerSub.unsubscribe();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerSub) this.timerSub.unsubscribe();
    if (this.fetchSub) this.fetchSub.unsubscribe();
  }
}
