import {
  deltaClassName,
  formatDeltaInt,
  formatDeltaMicro,
  formatDeltaNumber,
  formatPercent,
  formatXg,
} from './test-harness-format-utils';

describe('test-harness-format-utils', () => {
  it('formats xG-like numbers with two decimals', () => {
    expect(formatXg(1.236)).toBe('1.24');
    expect(formatXg(0)).toBe('0.00');
  });

  it('keeps missing xG values readable', () => {
    expect(formatXg(null)).toBe('-');
    expect(formatXg(undefined)).toBe('-');
    expect(formatXg(Number.NaN)).toBe('-');
  });

  it('formats percentages as rounded whole numbers', () => {
    expect(formatPercent(49.6)).toBe('50%');
    expect(formatPercent(null)).toBe('?');
  });

  it('formats integer deltas with explicit positive sign', () => {
    expect(formatDeltaInt(2.4)).toBe('+2');
    expect(formatDeltaInt(-2.4)).toBe('-2');
    expect(formatDeltaInt(0)).toBe('0');
  });

  it('formats normal deltas with a neutral deadzone', () => {
    expect(formatDeltaNumber(0.004)).toBe('0.00');
    expect(formatDeltaNumber(0.01)).toBe('+0.01');
    expect(formatDeltaNumber(-0.01)).toBe('-0.01');
  });

  it('formats micro deltas with a smaller neutral deadzone', () => {
    expect(formatDeltaMicro(0.0004)).toBe('±0.000');
    expect(formatDeltaMicro(0.001)).toBe('+0.001');
    expect(formatDeltaMicro(-0.001)).toBe('-0.001');
  });

  it('maps deltas to css classes', () => {
    expect(deltaClassName(0.004)).toBe('delta-neutral');
    expect(deltaClassName(0.01)).toBe('delta-positive');
    expect(deltaClassName(-0.01)).toBe('delta-negative');
  });
});
