export function formatXg(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  return value.toFixed(2);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '?';
  }
  return `${Math.round(value)}%`;
}

export function formatDeltaInt(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return '0';
  }
  return value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}`;
}

export function formatDeltaNumber(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
    return '0.00';
  }
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

export function formatDeltaMicro(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.0005) {
    return '±0.000';
  }
  return value > 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
}

export function deltaClassName(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) {
    return 'delta-neutral';
  }
  return value > 0 ? 'delta-positive' : 'delta-negative';
}
