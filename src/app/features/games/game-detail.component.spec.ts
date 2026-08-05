import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { GameDetailComponent } from './game-detail.component';
import { AuthService } from '../../core/services/auth.service';
import { CareerService } from '../../core/services/career.service';
import { GameService } from '../../core/services/game.service';
import { MatchService } from '../matches/services/match.service';

describe('GameDetailComponent', () => {
  let fixture: ComponentFixture<GameDetailComponent>;
  let component: GameDetailComponent;
  let routerSpy: jasmine.SpyObj<Router>;
  let careerServiceSpy: jasmine.SpyObj<CareerService>;
  let gameServiceSpy: jasmine.SpyObj<GameService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let matchServiceSpy: jasmine.SpyObj<MatchService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], { events: of() });
    careerServiceSpy = jasmine.createSpyObj('CareerService', [
      'getCareerStatus',
      'advanceToNextRound',
      'getCareerTeams'
    ]);
    gameServiceSpy = jasmine.createSpyObj('GameService', ['getGameById']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getUserInfo']);
    matchServiceSpy = jasmine.createSpyObj('MatchService', ['getMatchesByGameId']);

    gameServiceSpy.getGameById.and.returnValue(of({
      id: 'career-1',
      userId: 'user-1',
      teamId: 'team-1',
      name: 'Career 1',
      createdAt: '2026-07-21T00:00:00Z'
    }));
    authServiceSpy.getUserInfo.and.returnValue(of({ username: 'Ivan', teamName: 'Las Palmas' } as any));
    careerServiceSpy.getCareerTeams.and.returnValue(of([] as any));

    await TestBed.configureTestingModule({
      imports: [GameDetailComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: CareerService, useValue: careerServiceSpy },
        { provide: GameService, useValue: gameServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MatchService, useValue: matchServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'id' ? 'career-1' : null
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GameDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('advances from WAITING_USER using career next-round instead of legacy match list', () => {
    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerId: 'career-1',
      careerPhase: 'WAITING_USER',
      currentRound: 2,
      totalRounds: 10,
      isFinished: false
    } as any));
    careerServiceSpy.advanceToNextRound.and.returnValue(of({
      success: true,
      careerPhase: 'PRE_MATCH',
      currentRound: 3
    }));

    component.playFirstRound();

    expect(careerServiceSpy.advanceToNextRound).toHaveBeenCalledWith('career-1');
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/games/career-1/round/3/live'],
      jasmine.objectContaining({ state: jasmine.objectContaining({ managerRoundStart: jasmine.any(Object) }) })
    );
    expect(component.errorMsg).toBe('');
  });

  it('navigates to the current live round when career is already PRE_MATCH', () => {
    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerId: 'career-1',
      careerPhase: 'PRE_MATCH',
      currentRound: 4,
      totalRounds: 10,
      isFinished: false
    } as any));
    careerServiceSpy.advanceToNextRound.and.returnValue(of({
      success: true,
      careerPhase: 'PRE_MATCH',
      currentRound: 4,
      totalRounds: 10
    } as any));
    careerServiceSpy.getCareerStatus.calls.reset();

    component.playFirstRound();

    expect(careerServiceSpy.advanceToNextRound).toHaveBeenCalledWith('career-1');
    expect(careerServiceSpy.getCareerStatus).not.toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      ['/games/career-1/round/4/live'],
      jasmine.objectContaining({ state: jasmine.objectContaining({ managerRoundStart: jasmine.any(Object) }) })
    );
  });

  it('shows a useful error when next-round fails', () => {
    careerServiceSpy.getCareerStatus.and.returnValue(of({
      careerId: 'career-1',
      careerPhase: 'WAITING_USER',
      currentRound: 2,
      totalRounds: 10,
      isFinished: false
    } as any));
    careerServiceSpy.advanceToNextRound.and.returnValue(throwError(() => ({
      error: { message: 'No se pudo avanzar' }
    })));

    component.playFirstRound();

    expect(component.errorMsg).toBe('No se pudo avanzar');
  });
});
