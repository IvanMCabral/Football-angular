import {
  BackFiveFamilyLabRow,
  BackFiveTransitionLabRow,
  LowBlockLabRow,
} from '../models/test-harness.model';

export function lowBlockLabRead(
  variant: LowBlockLabRow['variant'],
  deltaXgFor: number,
  deltaXgAgainst: number,
  deltaShotsAgainst: number,
  deltaPossessionFor: number
): string {
  if (variant === 'base') return 'Referencia';
  if (variant === 'high') {
    if (deltaXgFor > 0.03 && (deltaXgAgainst > 0.02 || deltaShotsAgainst > 0.20)) {
      return 'Más salida, más riesgo';
    }
    if (deltaXgFor > 0.03) return 'Más salida';
    return 'Revisar salida';
  }
  if (deltaXgAgainst < -0.02 || deltaShotsAgainst < -0.20) return 'Más bloque';
  if (deltaPossessionFor < -0.75 && (deltaXgAgainst > 0.02 || deltaShotsAgainst > 0.20)) {
    return 'Demasiado hundido';
  }
  return 'Bloque similar';
}

export function lowBlockLabClass(
  variant: LowBlockLabRow['variant'],
  deltaXgAgainst: number,
  deltaShotsAgainst: number
): string {
  if (variant === 'base') return 'read-check';
  if (variant === 'low') {
    return deltaXgAgainst < -0.02 || deltaShotsAgainst < -0.20 ? 'read-strong' : 'read-visible';
  }
  return deltaXgAgainst > 0.02 || deltaShotsAgainst > 0.20 ? 'read-visible' : 'read-check';
}

export function backFiveTransitionRead(
  variant: BackFiveTransitionLabRow['variant'],
  deltaXgFor: number,
  deltaXgAgainst: number,
  deltaWideShotsFor: number
): string {
  if (variant === 'base') return 'Referencia';
  if (variant === 'high') {
    if ((deltaXgFor > 0.03 || deltaWideShotsFor > 0.20) && deltaXgAgainst > 0.02) return 'Más transición, más riesgo';
    if (deltaXgFor > 0.03 || deltaWideShotsFor > 0.20) return 'Más transición';
    return 'Revisar salida';
  }
  if (deltaXgAgainst < -0.02) return 'Más cobertura';
  return 'Cobertura similar';
}

export function backFiveTransitionClass(
  variant: BackFiveTransitionLabRow['variant'],
  deltaXgFor: number,
  deltaXgAgainst: number,
  deltaWideShotsFor: number
): string {
  if (variant === 'base') return 'read-check';
  if (variant === 'high') return deltaXgFor > 0.03 || deltaWideShotsFor > 0.20 ? 'read-visible' : 'read-check';
  return deltaXgAgainst < -0.02 ? 'read-strong' : 'read-visible';
}

export function backFiveFamilyRead(
  key: BackFiveFamilyLabRow['key'],
  deltaXgFor: number,
  deltaXgAgainst: number,
  deltaWideShotsFor: number,
  deltaWideShotsAgainst: number
): string {
  if (key === 'transition') return 'Referencia transición';
  if (key === 'low-block') {
    if (deltaXgAgainst < -0.03 && deltaXgFor < -0.03) return 'Bloque bajo: protege, resigna salida';
    if (deltaXgAgainst < -0.03) return 'Bloque bajo más seguro';
    return 'Bloque bajo a revisar';
  }
  if ((deltaXgFor > 0.03 || deltaWideShotsFor > 0.20) && (deltaXgAgainst > 0.02 || deltaWideShotsAgainst > 0.15)) {
    return 'Carrileros altos: más banda, más riesgo';
  }
  if (deltaXgFor > 0.03 || deltaWideShotsFor > 0.20) return 'Carrileros altos: más banda';
  if (deltaXgAgainst > 0.12) return 'Carrileros altos: riesgo sin ventaja clara';
  return 'Carrileros altos neutros';
}

export function backFiveFamilyClass(
  key: BackFiveFamilyLabRow['key'],
  deltaXgFor: number,
  deltaXgAgainst: number,
  deltaWideShotsFor: number,
  deltaWideShotsAgainst: number
): string {
  if (key === 'transition') return 'read-check';
  if (key === 'low-block') return deltaXgAgainst < -0.03 ? 'read-strong' : 'read-visible';
  return deltaXgFor > 0.03 || deltaWideShotsFor > 0.20 || deltaWideShotsAgainst > 0.15 ? 'read-visible' : 'read-check';
}
