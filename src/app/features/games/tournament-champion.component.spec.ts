import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { TournamentChampionComponent } from './tournament-champion.component';
import { CareerService } from '../../core/services/career.service';
import { GameService } from '../../core/services/game.service';

describe('Tournament champion authority', () => {
  let career: jasmine.SpyObj<CareerService>;
  beforeEach(() => {
    career = jasmine.createSpyObj('CareerService', ['getCareerStatus', 'getChampion', 'getStandings', 'continueToNewSeason']);
    career.getStandings.and.returnValue(of([]));
    career.getChampion.and.returnValue(of({ teamName: 'Athletic Club', teamId: 'club', points: 90, wins: 30, goalDifference: 50 }));
    TestBed.configureTestingModule({ imports: [TournamentChampionComponent], providers: [provideRouter([]),
      { provide: CareerService, useValue: career }, { provide: GameService, useValue: {} },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['gameId', 'career']]) } } }
    ] });
  });
  it('does not announce a champion or request one during an active season', () => {
    career.getCareerStatus.and.returnValue(of({ careerId: 'career', careerPhase: 'WAITING_USER' } as any));
    const fixture = TestBed.createComponent(TournamentChampionComponent);
    fixture.detectChanges();
    expect(career.getChampion).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('La temporada sigue en juego');
    expect(fixture.nativeElement.textContent).not.toContain('¡Torneo finalizado!');
    expect(fixture.nativeElement.querySelector('.podium')).toBeNull();
  });
  it('shows the authoritative winner after the season finishes', () => {
    career.getCareerStatus.and.returnValue(of({ careerId: 'career', careerPhase: 'FINISHED' } as any));
    const fixture = TestBed.createComponent(TournamentChampionComponent);
    fixture.detectChanges();
    expect(career.getChampion).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('¡Torneo finalizado!');
    expect(fixture.nativeElement.textContent).toContain('Athletic Club');
  });
  it('does not show the active career standings for another route', () => {
    career.getCareerStatus.and.returnValue(of({ careerId: 'other', careerPhase: 'FINISHED' } as any));
    const fixture = TestBed.createComponent(TournamentChampionComponent);
    fixture.detectChanges();
    expect(career.getChampion).not.toHaveBeenCalled();
    expect(career.getStandings).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('no corresponde a tu carrera activa');
  });

  it('disables repeated continuation while pending and allows retry after a failure', () => {
    career.getCareerStatus.and.returnValue(of({ careerId: 'career', careerPhase: 'FINISHED' } as any));
    const pending = new Subject<any>();
    career.continueToNewSeason.and.returnValue(pending);
    const fixture = TestBed.createComponent(TournamentChampionComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.continueToNewSeason(); component.continueToNewSeason();
    fixture.detectChanges();
    expect(career.continueToNewSeason).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.btn-success').disabled).toBeTrue();
    pending.error({ message: 'Connection interrupted' });
    fixture.detectChanges();
    expect(component.startingSeason).toBeFalse();
    expect(fixture.nativeElement.querySelector('.btn-success').disabled).toBeFalse();
    career.continueToNewSeason.and.returnValue(of({ success: false, message: 'Try again' }));
    component.continueToNewSeason();
    expect(career.continueToNewSeason).toHaveBeenCalledTimes(2);
    expect(component.errorMsg).toBe('Try again');
  });
});
