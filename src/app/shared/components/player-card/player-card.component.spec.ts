/**
 * V25D78-C55.7.7 BUG-L3: tests for the "Returns Fecha N" suffix in
 * {@link PlayerCardComponent#injuryDetail} when {@code currentRound} is
 * provided.
 *
 * <p>Pre-fix the player card showed "Out 1 match" / "Out N matches"
 * with no specificity about WHEN the player would be back. Post-fix
 * the card appends "· Returns Fecha X" when {@code currentRound} is
 * set, so the user can plan around the absence.
 *
 * <p>Coverage:
 * <ul>
 *   <li>currentRound=5, remaining=1 → "Out 1 match · Returns Fecha 6".</li>
 *   <li>currentRound=5, remaining=3 → "Out 3 matches · Returns Fecha 8".</li>
 *   <li>currentRound=null → fallback to "Out N matches" (back-compat).</li>
 *   <li>remaining<=0 → "Unavailable" (no Returns hint, no false info).</li>
 *   <li>injured=false → empty string (no spurious Returns hint).</li>
 * </ul>
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCardComponent } from './player-card.component';
import { PlayerCardData } from './player-card.model';

describe('PlayerCardComponent — V25D78-C55.7.7 BUG-L3 (injury Returns Fecha hint)', () => {
  let component: PlayerCardComponent;
  let fixture: ComponentFixture<PlayerCardComponent>;

  const basePlayer: PlayerCardData = {
    sessionPlayerId: 'p-1',
    name: 'Test Player',
    position: 'CB',
    injured: true,
    injuryRemainingMatches: 1,
    injuredType: null,
    energy: 50
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerCardComponent);
    component = fixture.componentInstance;
    component.player = { ...basePlayer };
  });

  it('L3 happy path: currentRound=5, remaining=1 → "Out 1 match · Returns Fecha 6"', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 1;
    expect(component.injuryDetail()).toBe('Out 1 match · Returns Fecha 6');
  });

  it('L3 multi-match: currentRound=5, remaining=3 → "Out 3 matches · Returns Fecha 8"', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 3;
    expect(component.injuryDetail()).toBe('Out 3 matches · Returns Fecha 8');
  });

  it('L3 back-compat: currentRound=null → fallback to "Out N matches" (no Returns hint)', () => {
    component.currentRound = null;
    component.player.injuryRemainingMatches = 2;
    // Pre-fix behavior preserved for callers that don't pass currentRound
    // (e.g. detail pages with no career context).
    expect(component.injuryDetail()).toBe('Out 2 matches');
  });

  it('L3 zero/negative remaining → "Unavailable" (no false Returns hint)', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 0;
    expect(component.injuryDetail()).toBe('Unavailable');

    component.player.injuryRemainingMatches = null;
    expect(component.injuryDetail()).toBe('Unavailable');
  });

  it('L3 not injured → empty string (no spurious injury info)', () => {
    component.currentRound = 5;
    component.player.injured = false;
    component.player.injuryRemainingMatches = 2;
    expect(component.injuryDetail()).toBe('');
  });
});
