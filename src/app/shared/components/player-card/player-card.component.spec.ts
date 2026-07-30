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

  it('does not render trait chips when specialTraits is missing or empty', () => {
    component.player = { ...basePlayer, specialTraits: undefined };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.trait-chip').length).toBe(0);

    component.player = { ...basePlayer, specialTraits: [] };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.trait-chip').length).toBe(0);
  });

  it('renders one special trait chip with name and description tooltip', () => {
    component.player = {
      ...basePlayer,
      specialTraits: [
        { code: 'leader', name: 'Leader', description: 'Collective mentality stabilizer.' }
      ]
    };

    fixture.detectChanges();

    const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.trait-chip'));
    expect(chips.length).toBe(1);
    expect(chips[0].textContent?.trim()).toBe('Leader');
    expect(chips[0].getAttribute('title')).toBe('Collective mentality stabilizer.');
    expect(chips[0].getAttribute('aria-label')).toBe('Leader: Collective mentality stabilizer.');
  });

  it('renders exactly two special trait chips in backend order', () => {
    component.player = {
      ...basePlayer,
      specialTraits: [
        { code: 'one_on_one_keeper', name: 'One-on-one keeper', description: 'Stops clear chances.' },
        { code: 'sweeper_keeper', name: 'Sweeper keeper', description: 'Protects space behind the line.' }
      ]
    };

    fixture.detectChanges();

    const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.trait-chip'));
    expect(chips.map(chip => chip.textContent?.trim())).toEqual(['One-on-one keeper', 'Sweeper keeper']);
  });

  it('keeps the UI stable when an invalid payload contains more than two traits', () => {
    component.player = {
      ...basePlayer,
      specialTraits: [
        { code: 'leader', name: 'Leader', description: 'Mental boost.' },
        { code: 'workhorse', name: 'Workhorse', description: 'High effort.' },
        { code: 'speedster', name: 'Speedster', description: 'Fast runner.' }
      ]
    };

    fixture.detectChanges();

    const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.trait-chip'));
    expect(chips.length).toBe(2);
    expect(chips.map(chip => chip.textContent?.trim())).toEqual(['Leader', 'Workhorse']);
  });

  it('renders UTF-8 trait names from a real backend-style payload', () => {
    component.player = {
      ...basePlayer,
      name: 'João Pedro',
      position: 'GK',
      specialTraits: [
        {
          code: 'one_on_one_keeper',
          name: 'Arquero uno contra uno',
          description: 'Rinde mejor en mano a mano y presión alta.'
        },
        {
          code: 'sweeper_keeper',
          name: 'Líbero del área',
          description: 'Cubre pelotas profundas detrás de la defensa.'
        }
      ]
    };

    fixture.detectChanges();

    const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.trait-chip'));
    expect(chips.map(chip => chip.textContent?.trim())).toEqual(['Arquero uno contra uno', 'Líbero del área']);
    expect(chips[1].getAttribute('title')).toBe('Cubre pelotas profundas detrás de la defensa.');
    expect(chips[1].getAttribute('aria-label')).toBe('Líbero del área: Cubre pelotas profundas detrás de la defensa.');
  });

  it('renders representative Spanish and Portuguese names without mojibake', () => {
    component.player = {
      ...basePlayer,
      name: 'Aitor Fernández / Antonio Rüdiger / João Cancelo',
      position: 'CB',
      specialTraits: [
        {
          code: 'coverage_leader',
          name: 'Cobertura aérea',
          description: 'Ordena la línea, corrige desmarques y sostiene presión.'
        },
        {
          code: 'technical_marker',
          name: 'Marcador técnico',
          description: 'Usa intuición, precisión y fuerza sin perder posición.'
        }
      ]
    };

    fixture.detectChanges();

    const visibleText = fixture.nativeElement.textContent ?? '';
    const chips: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.trait-chip'));
    expect(visibleText).toContain('Aitor Fernández / Antonio Rüdiger / João Cancelo');
    expect(chips.map(chip => chip.textContent?.trim())).toEqual(['Cobertura aérea', 'Marcador técnico']);
    expect(chips[0].getAttribute('aria-label')).toBe('Cobertura aérea: Ordena la línea, corrige desmarques y sostiene presión.');
    expect(chips[1].getAttribute('aria-label')).toBe('Marcador técnico: Usa intuición, precisión y fuerza sin perder posición.');
    expect(visibleText).toMatch(/[ñáéíóúüçã]/);
    expect(visibleText).not.toMatch(/Ã|Â|â|ð|ï¿½|�/);
  });
});
