import { csvCell, csvLines } from './test-harness-export-utils';

describe('test-harness-export-utils', () => {
  it('keeps simple CSV cells readable', () => {
    expect(csvCell('plain text')).toBe('plain text');
    expect(csvCell(42)).toBe('42');
  });

  it('keeps nullish CSV cells empty', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes CSV cells with separators or new lines', () => {
    expect(csvCell('one,two')).toBe('"one,two"');
    expect(csvCell('one\ntwo')).toBe('"one\ntwo"');
  });

  it('escapes quotes inside quoted CSV cells', () => {
    expect(csvCell('he said "ok"')).toBe('"he said ""ok"""');
  });

  it('builds CSV lines from a header and plain rows', () => {
    expect(csvLines(['name', 'score'], [
      { name: 'A', score: 1 },
      { name: 'B', score: 2 },
    ])).toEqual([
      'name,score',
      'A,1',
      'B,2',
    ]);
  });

  it('builds CSV lines with escaped row values', () => {
    expect(csvLines(['name', 'note'], [
      { name: 'A', note: 'wide, central' },
    ])).toEqual([
      'name,note',
      'A,"wide, central"',
    ]);
  });
});
