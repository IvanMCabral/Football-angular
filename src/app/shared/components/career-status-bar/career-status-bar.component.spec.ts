/**
 * C55.10 Item 4 — tests for {@link CareerStatusBarComponent}'s newly added
 * División pill.
 *
 * <p>Coverage:
 * <ul>
 *   <li>Pill renders when {@code careerStatus.userDivision} is set (PRIMERA).</li>
 *   <li>Pill renders when userDivision is a non-PRIMERA/SEGUNDA/TERCERA tier
 *       (CUARTA) with the {@code tier-default} fallback class.</li>
 *   <li>Pill hides when userDivision is null / omitted (legacy back).</li>
 *   <li>The four action buttons (fixture / standings / palmares / promotions)
 *       still emit their respective EventEmitters.</li>
 *   <li>{@link tierCssClass} helper covers the four-class contract.</li>
 * </ul>
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CareerStatusBarComponent } from './career-status-bar.component';
import { CareerStatus } from 'app/core/services/career.model';

describe('CareerStatusBarComponent — V25D78-C55.10 Item 4 (División pill)', () => {
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
    // C55.10 Item 4 — same tier-real contract as the dashboard pill:
    // backend sends the literal label, front CONSUMES it verbatim. CSS
    // class falls back to tier-default for tiers outside the
    // PRIMERA/SEGUNDA/TERCERA set.
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

  it('keeps emitting fixtureClick on the 📅 button', () => {
    component.careerStatus = makeStatus({ userDivision: 'PRIMERA' });
    fixture.detectChanges();

    spyOn(component.fixtureClick, 'emit');
    const btn = fixture.nativeElement.querySelector('.btn-action');
    expect(btn).not.toBeNull();
    btn.click();
    expect(component.fixtureClick.emit).toHaveBeenCalledTimes(1);
  });

  it('keeps emitting standingsClick on the 🏆 button', () => {
    component.careerStatus = makeStatus({ userDivision: 'PRIMERA' });
    fixture.detectChanges();

    spyOn(component.standingsClick, 'emit');
    const btn = fixture.nativeElement.querySelector('.btn-standings');
    expect(btn).not.toBeNull();
    btn.click();
    expect(component.standingsClick.emit).toHaveBeenCalledTimes(1);
  });

  it('tierCssClass() helper covers PRIMERA/SEGUNDA/TERCERA/tier-default', () => {
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
