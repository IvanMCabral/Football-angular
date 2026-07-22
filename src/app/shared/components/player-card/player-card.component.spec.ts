/**
 * V25D78-C55.7.7 BUG-L3: tests for the "Vuelve en fecha N" suffix in
 * {@link PlayerCardComponent#injuryDetail} when {@code currentRound} is
 * provided.
 *
 * <p>Pre-fix the player card showed "Fuera 1 partido" / "Fuera N partidos"
 * with no specificity about WHEN the player would be back. Post-fix
 * the card appends "· Vuelve en fecha X" when {@code currentRound} is
 * set, so the user can plan around the absence.
 *
 * <p>Coverage:
 * <ul>
 *   <li>currentRound=5, remaining=1 → "Fuera 1 partido · Vuelve en fecha 6".</li>
 *   <li>currentRound=5, remaining=3 → "Fuera 3 partidos · Vuelve en fecha 8".</li>
 *   <li>currentRound=null → fallback to "Fuera N partidos" (back-compat).</li>
 *   <li>remaining<=0 → "No disponible" (sin aviso de vuelta, no false info).</li>
 *   <li>injured=false → empty string (sin aviso falso de vuelta).</li>
 * </ul>
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCardComponent } from './player-card.component';
import { PlayerCardData } from './player-card.model';

describe('PlayerCardComponent — V25D78-C55.7.7 BUG-L3 (injury Vuelve en fecha hint)', () => {
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

  it('L3 happy path: currentRound=5, remaining=1 → "Fuera 1 partido · Vuelve en fecha 6"', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 1;
    expect(component.injuryDetail()).toBe('Fuera 1 partido · Vuelve en fecha 6');
  });

  it('L3 multi-match: currentRound=5, remaining=3 → "Fuera 3 partidos · Vuelve en fecha 8"', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 3;
    expect(component.injuryDetail()).toBe('Fuera 3 partidos · Vuelve en fecha 8');
  });

  it('L3 back-compat: currentRound=null → fallback to "Fuera N partidos" (sin aviso de vuelta)', () => {
    component.currentRound = null;
    component.player.injuryRemainingMatches = 2;
    // Pre-fix behavior preserved for callers that don't pass currentRound
    // (e.g. detail pages with no career context).
    expect(component.injuryDetail()).toBe('Fuera 2 partidos');
  });

  it('L3 zero/negative remaining → "No disponible" (sin aviso falso de vuelta)', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 0;
    expect(component.injuryDetail()).toBe('No disponible');

    component.player.injuryRemainingMatches = null;
    expect(component.injuryDetail()).toBe('No disponible');
  });

  it('L3 not injured → empty string (sin info falsa de lesi?n)', () => {
    component.currentRound = 5;
    component.player.injured = false;
    component.player.injuryRemainingMatches = 2;
    expect(component.injuryDetail()).toBe('');
  });
});
