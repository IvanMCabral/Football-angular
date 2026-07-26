import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCardComponent } from './player-card.component';
import { PlayerCardData } from './player-card.model';

describe('PlayerCardComponent injury availability details', () => {
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

  it('shows the return round for a one-match injury when the current round is known', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 1;
    expect(component.injuryDetail()).toBe('Fuera 1 partido · Vuelve en fecha 6');
  });

  it('shows the return round for a multi-match injury when the current round is known', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 3;
    expect(component.injuryDetail()).toBe('Fuera 3 partidos · Vuelve en fecha 8');
  });

  it('falls back to a relative absence label when the current round is unknown', () => {
    component.currentRound = null;
    component.player.injuryRemainingMatches = 2;
    expect(component.injuryDetail()).toBe('Fuera 2 partidos');
  });

  it('does not show a return round when remaining matches are missing or zero', () => {
    component.currentRound = 5;
    component.player.injuryRemainingMatches = 0;
    expect(component.injuryDetail()).toBe('No disponible');

    component.player.injuryRemainingMatches = null;
    expect(component.injuryDetail()).toBe('No disponible');
  });

  it('returns an empty detail when the player is not injured', () => {
    component.currentRound = 5;
    component.player.injured = false;
    component.player.injuryRemainingMatches = 2;
    expect(component.injuryDetail()).toBe('');
  });
});
