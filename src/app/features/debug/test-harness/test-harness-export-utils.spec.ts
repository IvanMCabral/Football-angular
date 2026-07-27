import { csvCell, csvLines, downloadTextFile, playerSwapMatrixExportRow } from './test-harness-export-utils';
import { PlayerSwapMatrixSummary } from '../models/test-harness.model';

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
    const appendChildSpy = spyOn(document.body, 'appendChild').and.callThrough();
    const removeChildSpy = spyOn(document.body, 'removeChild').and.callThrough();

    downloadTextFile('hello', 'report.csv', 'text/csv;charset=utf-8');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(anchor.href).toContain('blob:test-url');
    expect(anchor.download).toBe('report.csv');
    expect(anchor.style.display).toBe('none');
    expect(appendChildSpy).toHaveBeenCalledWith(anchor);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(anchor);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test-url');
  });

  it('maps player swap summaries to flat export rows', () => {
    const row = {
      testCase: 'swap',
      swapRead: 'review',
      swapReadDetail: 'detail',
      swapFit: 'profile',
      swapFitDetail: 'fit detail',
      signalScore: 1,
      signalRead: 'signal',
      signalDetail: 'signal detail',
      tacticalAttackRead: 'attack',
      tacticalCentralControlRead: 'control',
      tacticalProtectionRead: 'protect',
      tacticalChannelsRead: 'channels',
      tacticalBreakdownDetail: 'breakdown',
      formation: '4-4-2',
      slotId: 'S1',
      baselinePlayer: 'A',
      swapPlayer: 'B',
      baselinePlayerOverall: 70,
      swapPlayerOverall: 75,
      deltaPlayerOverall: 5,
      seedStart: 1,
      seedEnd: 3,
      seedCount: 3,
      deltaGoalsFor: 1,
      deltaGoalsAgainst: 0,
      deltaGoalDiff: 1,
      deltaShotsFor: 2,
      deltaShotsAgainst: -1,
      deltaPossessionFor: 0.5,
      deltaXgFor: 0.2,
      deltaXgAgainst: -0.1,
      deltaXgDiff: 0.3,
      preAutoSubDeltaShotsFor: 1,
      preAutoSubDeltaShotsAgainst: 0,
      preAutoSubDeltaXgFor: 0.1,
      preAutoSubDeltaXgAgainst: 0,
      preAutoSubDeltaXgDiff: 0.1,
      deltaCentralShotsFor: 1,
      deltaWideShotsFor: 1,
      deltaLongShotsFor: 0,
      deltaCentralShotsAgainst: 0,
      deltaWideShotsAgainst: -1,
      deltaLongShotsAgainst: 0,
      baseline: { avgXgFor: 1.1, avgXgAgainst: 0.8, avgXgDiff: 0.3 },
      swapped: { avgXgFor: 1.3, avgXgAgainst: 0.7, avgXgDiff: 0.6 },
      timestamp: 'now',
    } as PlayerSwapMatrixSummary;

    expect(playerSwapMatrixExportRow(row)).toEqual(jasmine.objectContaining({
      testCase: 'swap',
      formation: '4-4-2',
      baselineAvgXgFor: 1.1,
      swappedAvgXgDiff: 0.6,
    }));
  });
});
