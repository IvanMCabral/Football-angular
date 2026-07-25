import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CareerStatusBarComponent } from './career-status-bar.component';
import { CareerStatus } from 'app/core/services/career.model';

describe('CareerStatusBarComponent', () => {
  let component: CareerStatusBarComponent;
  let fixture: ComponentFixture<CareerStatusBarComponent>;

  function makeStatus(overrides: Partial<CareerStatus>): CareerStatus {
    return {
      careerId: 'career-1',
      season: 2,
      currentRound: 5,
      totalRounds: 38,
      userTeamId: 'ut-1',
      userSessionTeamId: 'ut-1',
      userTeamName: 'Real Madrid',
      hasLastMatchPlayed: false,
      nextMatchId: null,
      engineStatus: 'IDLE',
      canAdvanceRound: true,
      careerPhase: 'WAITING_USER',
      squadSize: 22,
      freePlayersCount: 3,
      ...overrides
    } as CareerStatus;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareerStatusBarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CareerStatusBarComponent);
    component = fixture.componentInstance;
  });

  it('renders the División pill with tier-primera when userDivision=PRIMERA', () => {
    component.careerStatus = makeStatus({ userDivision: 'PRIMERA' });
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector('.status-division-pill');
    expect(pill).not.toBeNull('status-division-pill must render when userDivision is set');
    expect(pill.textContent.trim()).toBe('PRIMERA');
    expect(pill.className).toContain('tier-primera');
  });

  it('renders the División pill with tier-default when userDivision=CUARTA (non-canonical tier)', () => {
    component.careerStatus = makeStatus({ userDivision: 'CUARTA' });
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector('.status-division-pill');
    expect(pill).not.toBeNull('status-division-pill must render for CUARTA');
    expect(pill.textContent.trim()).toBe('CUARTA',
      'pill must display backend label verbatim');
    expect(pill.className).toContain('tier-default');
    expect(pill.className).not.toContain('tier-primera');
  });

  it('hides the División pill when userDivision is null (legacy back)', () => {
    component.careerStatus = makeStatus({ userDivision: null });
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector('.status-division-pill');
    expect(pill).toBeNull('status-division-pill must NOT render when userDivision is null');
  });

  it('hides the División pill when userDivision is omitted (legacy back)', () => {
    component.careerStatus = makeStatus({});
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector('.status-division-pill');
    expect(pill).toBeNull('status-division-pill must NOT render when userDivision is omitted');
  });

  it('emits fixtureClick from the fixture button', () => {
    component.careerStatus = makeStatus({ userDivision: 'PRIMERA' });
    fixture.detectChanges();

    spyOn(component.fixtureClick, 'emit');
    const btn = fixture.nativeElement.querySelector('.btn-action');
    expect(btn).not.toBeNull();
    btn.click();
    expect(component.fixtureClick.emit).toHaveBeenCalledTimes(1);
  });

  it('emits standingsClick from the standings button', () => {
    component.careerStatus = makeStatus({ userDivision: 'PRIMERA' });
    fixture.detectChanges();

    spyOn(component.standingsClick, 'emit');
    const btn = fixture.nativeElement.querySelector('.btn-standings');
    expect(btn).not.toBeNull();
    btn.click();
    expect(component.standingsClick.emit).toHaveBeenCalledTimes(1);
  });

  it('maps known division labels to tier CSS classes', () => {
    expect(component.tierCssClass('PRIMERA')).toBe('tier-primera');
    expect(component.tierCssClass('SEGUNDA')).toBe('tier-segunda');
    expect(component.tierCssClass('TERCERA')).toBe('tier-tercera');
    expect(component.tierCssClass('CUARTA')).toBe('tier-default');
    expect(component.tierCssClass('QUINTA')).toBe('tier-default');
    expect(component.tierCssClass('SEXTA')).toBe('tier-default');
    expect(component.tierCssClass(null)).toBe('tier-default');
    expect(component.tierCssClass(undefined)).toBe('tier-default');
  });
});
