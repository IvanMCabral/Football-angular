import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { TeamDetailComponent } from './team-detail.component';
import { environment } from '../../../environments/environment';

describe('Career club detail', () => {
  it('loads only the selected owner club and its squad and renders ratings', async () => {
    await TestBed.configureTestingModule({ imports: [TeamDetailComponent], providers: [
      provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'club-1' })) } }
    ] }).compileComponents();
    const fixture = TestBed.createComponent(TeamDetailComponent); const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/career/teams/club-1`).flush({ sessionTeamId: 'club-1', name: 'Club', country: 'AR', budget: 1000, formation: '4-4-2', morale: 80 });
    http.expectOne(`${environment.apiUrl}/career/teams/club-1/squad`).flush([{ sessionPlayerId: 'p', name: 'Player', position: 'ST', age: 22, overall: 81, energy: 90 }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Player');
    expect(fixture.nativeElement.textContent).toContain('81');
    expect(fixture.nativeElement.textContent).not.toContain('Cargando club');
    http.verify();
  });
});
