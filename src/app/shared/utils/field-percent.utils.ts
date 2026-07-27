export const FIELD_PERCENT_MIN = 0;
export const FIELD_PERCENT_MAX = 100;
export const FIELD_PIXEL_TWEAK_MIN = -80;
export const FIELD_PIXEL_TWEAK_MAX = 80;

export function clampFieldPercent(value: number): number {
  return Math.max(FIELD_PERCENT_MIN, Math.min(FIELD_PERCENT_MAX, value));
}

export function clampFieldPercentRounded(value: number): number {
  return Number(clampFieldPercent(value).toFixed(2));
}

export function clampFieldPixelTweak(value: number): number {
  return Math.max(FIELD_PIXEL_TWEAK_MIN, Math.min(FIELD_PIXEL_TWEAK_MAX, value));
}
