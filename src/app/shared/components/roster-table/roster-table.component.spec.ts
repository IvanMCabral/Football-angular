import { TestBed } from '@angular/core/testing';
import { RosterTableComponent, RosterPlayer } from './roster-table.component';

describe('Compact roster management', () => {
  const players: RosterPlayer[] = [
    { sessionPlayerId: 'a', name: 'Nico', position: 'ST', age: 23, overall: 82, energy: 90, attack: 85 },
    { sessionPlayerId: 'b', name: 'Juan', position: 'CB', age: 28, overall: 75, injured: true },
    { sessionPlayerId: 'c', name: 'Nicolás', position: 'ST', age: 21, overall: 78, suspended: true }
  ];
  it('combines name, position, availability and sorting without changing source data', () => {
    const component = new RosterTableComponent(); component.players = players;
    component.query = 'nico'; component.position = 'ST'; component.sortBy = 'age';
    expect(component.filtered.map(p => p.sessionPlayerId)).toEqual(['c','a']);
    component.availability = 'available';
    expect(component.filtered.map(p => p.sessionPlayerId)).toEqual(['a']);
    expect(players.map(p => p.sessionPlayerId)).toEqual(['a','b','c']);
    expect(component.available(players[2])).toBeFalse();
  });
  it('opens player attributes with the row button and shows a useful empty filter state', async () => {
    await TestBed.configureTestingModule({ imports: [RosterTableComponent] }).compileComponents();
    const fixture = TestBed.createComponent(RosterTableComponent); fixture.componentInstance.players = players;
    fixture.detectChanges();
    const button: HTMLButtonElement = [...fixture.nativeElement.querySelectorAll('th button')].find((b: any) => b.textContent.includes('Nico')) as HTMLButtonElement;
    button.click(); fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Ataque');
    fixture.componentInstance.query = 'missing'; fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay jugadores que coincidan');
  });
});
