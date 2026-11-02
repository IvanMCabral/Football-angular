import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of, shareReplay, startWith, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionTeam } from '../../../shared/models/team.model';
import { SessionPlayer } from '../../../shared/models/player.model';

interface ClubState { loading: boolean; error: string; team: SessionTeam | null; players: SessionPlayer[]; }

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './team-detail.component.html',
  styleUrls: ['./team-detail.component.css']
})
export class TeamDetailComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  readonly state$ = this.route.paramMap.pipe(switchMap(params => {
    const id = encodeURIComponent(params.get('id') ?? '');
    return forkJoin({
      team: this.http.get<SessionTeam>(`${environment.apiUrl}/career/teams/${id}`),
      players: this.http.get<SessionPlayer[]>(`${environment.apiUrl}/career/teams/${id}/squad`)
    }).pipe(
      map(({ team, players }): ClubState => ({ loading: false, error: '', team, players })),
      catchError(() => of<ClubState>({ loading: false, error: 'No pudimos cargar este club. Volvé a la lista para elegir un equipo de tu carrera.', team: null, players: [] })),
      startWith<ClubState>({ loading: true, error: '', team: null, players: [] })
    );
  }), shareReplay({ bufferSize: 1, refCount: true }));

  formatBudget(value: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }
}
