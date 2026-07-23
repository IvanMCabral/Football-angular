import { csvCell, csvLines, downloadTextFile } from './test-harness-export-utils';

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

  it('downloads text files through a temporary object URL', () => {
    const anchor = document.createElement('a');
    const clickSpy = spyOn(anchor, 'click');
    const createElementSpy = spyOn(document, 'createElement').and.returnValue(anchor);
    const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
    const revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');

    downloadTextFile('hello', 'report.csv', 'text/csv;charset=utf-8');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(anchor.href).toContain('blob:test-url');
    expect(anchor.download).toBe('report.csv');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test-url');
  });
});
