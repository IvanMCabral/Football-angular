/** Bundled snapshot of FormationService; shared by preview, live editors and the visual lab.
 * Coordinates are team-relative: own goal below, attack upward. Never mirror writes.
 * The position catalogue contract test checks all 132 slots against the backend fixture.
 */
export interface TacticalSlotLayout { role: string; x: number; y: number; subdivisionId: string }
export const TACTICAL_LAYOUTS: Readonly<Record<string, readonly TacticalSlotLayout[]>> = {
  '4-4-2': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'LB', x: 16.65, y: 83, subdivisionId: 'S22-2' },
    { role: 'CB', x: 38.85, y: 83, subdivisionId: 'S23-1' },
    { role: 'CB', x: 61.05, y: 83, subdivisionId: 'S23-3' },
    { role: 'RB', x: 83.25, y: 83, subdivisionId: 'S24-2' },
    { role: 'LM', x: 16.65, y: 61, subdivisionId: 'S16-2' },
    { role: 'CM', x: 38.85, y: 61, subdivisionId: 'S17-1' },
    { role: 'CM', x: 61.05, y: 61, subdivisionId: 'S17-3' },
    { role: 'RM', x: 83.25, y: 61, subdivisionId: 'S18-2' },
    { role: 'ST', x: 38.85, y: 17, subdivisionId: 'S05-1' },
    { role: 'ST', x: 61.05, y: 17, subdivisionId: 'S05-3' },
  ],
  '4-3-3': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'LB', x: 16.65, y: 83, subdivisionId: 'S22-2' },
    { role: 'CB', x: 38.85, y: 83, subdivisionId: 'S23-1' },
    { role: 'CB', x: 61.05, y: 83, subdivisionId: 'S23-3' },
    { role: 'RB', x: 83.25, y: 83, subdivisionId: 'S24-2' },
    { role: 'CM', x: 38.85, y: 50, subdivisionId: 'S17-1' },
    { role: 'CM', x: 49.95, y: 55, subdivisionId: 'S17-2' },
    { role: 'CM', x: 61.05, y: 50, subdivisionId: 'S17-3' },
    { role: 'LW', x: 18, y: 18, subdivisionId: 'S04-1' },
    { role: 'ST', x: 50, y: 12, subdivisionId: 'S05-2' },
    { role: 'RW', x: 82, y: 18, subdivisionId: 'S06-3' },
  ],
  '3-5-2': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'CB', x: 27.75, y: 76, subdivisionId: 'S22-3' },
    { role: 'CB', x: 49.95, y: 78, subdivisionId: 'S23-2' },
    { role: 'CB', x: 72.15, y: 76, subdivisionId: 'S24-1' },
    { role: 'LWB', x: 12, y: 56, subdivisionId: 'S15-1' },
    { role: 'CM', x: 38.85, y: 61, subdivisionId: 'S17-1' },
    { role: 'CM', x: 49.95, y: 66, subdivisionId: 'S17-2' },
    { role: 'CM', x: 61.05, y: 61, subdivisionId: 'S17-3' },
    { role: 'RWB', x: 88, y: 56, subdivisionId: 'S18-3' },
    { role: 'ST', x: 38.85, y: 17, subdivisionId: 'S05-1' },
    { role: 'ST', x: 61.05, y: 17, subdivisionId: 'S05-3' },
  ],
  '4-2-3-1': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'LB', x: 16.65, y: 83, subdivisionId: 'S22-2' },
    { role: 'CB', x: 38.85, y: 83, subdivisionId: 'S23-1' },
    { role: 'CB', x: 61.05, y: 83, subdivisionId: 'S23-3' },
    { role: 'RB', x: 83.25, y: 83, subdivisionId: 'S24-2' },
    { role: 'CDM', x: 38.85, y: 66, subdivisionId: 'S17-1' },
    { role: 'CDM', x: 61.05, y: 66, subdivisionId: 'S17-3' },
    { role: 'LW', x: 22, y: 39, subdivisionId: 'S10-2' },
    { role: 'CAM', x: 49.95, y: 39, subdivisionId: 'S11-2' },
    { role: 'RW', x: 78, y: 39, subdivisionId: 'S12-2' },
    { role: 'ST', x: 50, y: 14, subdivisionId: 'S02-2' },
  ],
  '5-3-2': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'LWB', x: 10, y: 76, subdivisionId: 'S22-1' },
    { role: 'CB', x: 30, y: 78, subdivisionId: 'S22-2' },
    { role: 'CB', x: 49.95, y: 80, subdivisionId: 'S23-2' },
    { role: 'CB', x: 70, y: 78, subdivisionId: 'S24-2' },
    { role: 'RWB', x: 90, y: 76, subdivisionId: 'S24-3' },
    { role: 'CM', x: 38.85, y: 61, subdivisionId: 'S17-1' },
    { role: 'CM', x: 49.95, y: 66, subdivisionId: 'S17-2' },
    { role: 'CM', x: 61.05, y: 61, subdivisionId: 'S17-3' },
    { role: 'ST', x: 38.85, y: 17, subdivisionId: 'S05-1' },
    { role: 'ST', x: 61.05, y: 17, subdivisionId: 'S05-3' },
  ],
  '4-1-4-1': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'LB', x: 16.65, y: 83, subdivisionId: 'S22-2' },
    { role: 'CB', x: 38.85, y: 83, subdivisionId: 'S23-1' },
    { role: 'CB', x: 61.05, y: 83, subdivisionId: 'S23-3' },
    { role: 'RB', x: 83.25, y: 83, subdivisionId: 'S24-2' },
    { role: 'CDM', x: 49.95, y: 66, subdivisionId: 'S17-2' },
    { role: 'LM', x: 16.65, y: 50, subdivisionId: 'S16-2' },
    { role: 'CM', x: 38.85, y: 50, subdivisionId: 'S17-1' },
    { role: 'CM', x: 61.05, y: 50, subdivisionId: 'S17-3' },
    { role: 'RM', x: 83.25, y: 50, subdivisionId: 'S18-2' },
    { role: 'ST', x: 50, y: 14, subdivisionId: 'S02-2' },
  ],
  '3-4-3': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'CB', x: 27.75, y: 76, subdivisionId: 'S22-3' },
    { role: 'CB', x: 49.95, y: 78, subdivisionId: 'S23-2' },
    { role: 'CB', x: 72.15, y: 76, subdivisionId: 'S24-1' },
    { role: 'LWB', x: 12, y: 56, subdivisionId: 'S15-1' },
    { role: 'CM', x: 38.85, y: 61, subdivisionId: 'S17-1' },
    { role: 'CM', x: 61.05, y: 61, subdivisionId: 'S17-3' },
    { role: 'RWB', x: 88, y: 56, subdivisionId: 'S18-3' },
    { role: 'LW', x: 18, y: 18, subdivisionId: 'S04-1' },
    { role: 'ST', x: 50, y: 12, subdivisionId: 'S05-2' },
    { role: 'RW', x: 82, y: 18, subdivisionId: 'S06-3' },
  ],
  '3-5-2-CDM': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'CB', x: 27.75, y: 76, subdivisionId: 'S22-3' },
    { role: 'CB', x: 49.95, y: 78, subdivisionId: 'S23-2' },
    { role: 'CB', x: 72.15, y: 76, subdivisionId: 'S24-1' },
    { role: 'CDM', x: 49.95, y: 68, subdivisionId: 'S17-2' },
    { role: 'CM', x: 38.85, y: 59, subdivisionId: 'S17-1' },
    { role: 'CM', x: 61.05, y: 59, subdivisionId: 'S17-3' },
    { role: 'LWB', x: 12, y: 53, subdivisionId: 'S15-1' },
    { role: 'RWB', x: 88, y: 53, subdivisionId: 'S18-3' },
    { role: 'ST', x: 38.85, y: 17, subdivisionId: 'S05-1' },
    { role: 'ST', x: 61.05, y: 17, subdivisionId: 'S05-3' },
  ],
  '5-4-1': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'LWB', x: 10, y: 80, subdivisionId: 'S22-1' },
    { role: 'CB', x: 30, y: 83, subdivisionId: 'S22-2' },
    { role: 'CB', x: 49.95, y: 84, subdivisionId: 'S23-2' },
    { role: 'CB', x: 70, y: 83, subdivisionId: 'S24-2' },
    { role: 'RWB', x: 90, y: 80, subdivisionId: 'S24-3' },
    { role: 'LM', x: 16.65, y: 66, subdivisionId: 'S16-2' },
    { role: 'CM', x: 38.85, y: 70, subdivisionId: 'S17-1' },
    { role: 'CM', x: 61.05, y: 70, subdivisionId: 'S17-3' },
    { role: 'RM', x: 83.25, y: 66, subdivisionId: 'S18-2' },
    { role: 'ST', x: 50, y: 22, subdivisionId: 'S05-2' },
  ],
  '3-4-1-2': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'CB', x: 27.75, y: 76, subdivisionId: 'S22-3' },
    { role: 'CB', x: 49.95, y: 78, subdivisionId: 'S23-2' },
    { role: 'CB', x: 72.15, y: 76, subdivisionId: 'S24-1' },
    { role: 'LWB', x: 12, y: 56, subdivisionId: 'S15-1' },
    { role: 'CM', x: 38.85, y: 61, subdivisionId: 'S17-1' },
    { role: 'CM', x: 61.05, y: 61, subdivisionId: 'S17-3' },
    { role: 'RWB', x: 88, y: 56, subdivisionId: 'S18-3' },
    { role: 'CAM', x: 49.95, y: 39, subdivisionId: 'S11-2' },
    { role: 'ST', x: 38.85, y: 17, subdivisionId: 'S05-1' },
    { role: 'ST', x: 61.05, y: 17, subdivisionId: 'S05-3' },
  ],
  '4-2-2-2': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'LB', x: 16.65, y: 83, subdivisionId: 'S22-2' },
    { role: 'CB', x: 38.85, y: 83, subdivisionId: 'S23-1' },
    { role: 'CB', x: 61.05, y: 83, subdivisionId: 'S23-3' },
    { role: 'RB', x: 83.25, y: 83, subdivisionId: 'S24-2' },
    { role: 'CDM', x: 40, y: 68, subdivisionId: 'S17-1' },
    { role: 'CDM', x: 60, y: 68, subdivisionId: 'S17-3' },
    { role: 'CAM', x: 36, y: 43, subdivisionId: 'S10-2' },
    { role: 'CAM', x: 64, y: 43, subdivisionId: 'S12-2' },
    { role: 'ST', x: 38.85, y: 17, subdivisionId: 'S05-1' },
    { role: 'ST', x: 61.05, y: 17, subdivisionId: 'S05-3' },
  ],
  '4-1-2-3': [
    { role: 'GK', x: 50, y: 93.5, subdivisionId: 'GK-1' },
    { role: 'LB', x: 16.65, y: 83, subdivisionId: 'S22-2' },
    { role: 'CB', x: 38.85, y: 83, subdivisionId: 'S23-1' },
    { role: 'CB', x: 61.05, y: 83, subdivisionId: 'S23-3' },
    { role: 'RB', x: 83.25, y: 83, subdivisionId: 'S24-2' },
    { role: 'CDM', x: 49.95, y: 70, subdivisionId: 'S17-2' },
    { role: 'CM', x: 39, y: 53, subdivisionId: 'S17-1' },
    { role: 'CM', x: 61, y: 53, subdivisionId: 'S17-3' },
    { role: 'LW', x: 18, y: 18, subdivisionId: 'S04-1' },
    { role: 'ST', x: 50, y: 12, subdivisionId: 'S05-2' },
    { role: 'RW', x: 82, y: 18, subdivisionId: 'S06-3' },
  ],
};

const LINE_SIZES: Record<string, number[]> = {"4-4-2":[1,4,4,2],"4-3-3":[1,4,3,3],"3-5-2":[1,3,5,2],"4-2-3-1":[1,4,2,3,1],"5-3-2":[1,5,3,2],"4-1-4-1":[1,4,1,4,1],"3-4-3":[1,3,4,3],"3-5-2-CDM":[1,3,1,2,2,2],"5-4-1":[1,5,4,1],"3-4-1-2":[1,3,4,1,2],"4-2-2-2":[1,4,2,2,2],"4-1-2-3":[1,4,1,2,3]};
export const TACTICAL_ROLE_LINES: Record<string, string[][]> = Object.fromEntries(
  Object.entries(LINE_SIZES).map(([formation, sizes]) => {
    let offset = 0;
    return [formation, sizes.map(count => {
      const roles = TACTICAL_LAYOUTS[formation].slice(offset, offset + count).map(slot => slot.role);
      offset += count;
      return roles;
    })];
  })
);
export function tacticalSlotCoords(formation: string, index: number): { x: number; y: number } {
  const slot = TACTICAL_LAYOUTS[formation]?.[index];
  return slot ? { x: slot.x, y: slot.y } : { x: 50, y: 50 };
}
