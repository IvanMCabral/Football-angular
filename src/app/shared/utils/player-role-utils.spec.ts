import {
  countRoleFamily,
  getMarkerRoleClasses,
  getRoleFamily,
  rolesMatch
} from './player-role-utils';

describe('player-role-utils', () => {
  it('groups player roles into the four tactical families', () => {
    expect(getRoleFamily('GK')).toBe('GK');
    expect(getRoleFamily('CB')).toBe('DEF');
    expect(getRoleFamily('LWB')).toBe('DEF');
    expect(getRoleFamily('CM')).toBe('MID');
    expect(getRoleFamily('WINGER')).toBe('ATT');
    expect(getRoleFamily('unknown')).toBeNull();
  });

  it('matches exact roles and compatible tactical families', () => {
    expect(rolesMatch('CB', 'CB')).toBeTrue();
    expect(rolesMatch('LB', 'RWB')).toBeTrue();
    expect(rolesMatch('CM', 'CAM')).toBeTrue();
    expect(rolesMatch('ST', 'WINGER')).toBeTrue();
    expect(rolesMatch('GK', 'CB')).toBeFalse();
    expect(rolesMatch('LB', 'LW')).toBeFalse();
    expect(rolesMatch(undefined, 'CB')).toBeFalse();
  });

  it('returns marker classes from the same role families used by matching', () => {
    expect(getMarkerRoleClasses('GK')).toEqual(jasmine.objectContaining({ 'color-gk': true }));
    expect(getMarkerRoleClasses('LWB')).toEqual(jasmine.objectContaining({ 'color-def': true }));
    expect(getMarkerRoleClasses('CM')).toEqual(jasmine.objectContaining({ 'color-mid': true }));
    expect(getMarkerRoleClasses('WINGER')).toEqual(jasmine.objectContaining({ 'color-att': true }));
    expect(getMarkerRoleClasses(undefined)).toEqual({});
  });

  it('counts role families for formation detection', () => {
    expect(countRoleFamily(['GK', 'CB', 'LB', 'RB', 'CM', 'CAM', 'ST', 'WINGER'])).toEqual({
      gk: 1,
      def: 3,
      mid: 2,
      att: 2,
    });
  });
});
