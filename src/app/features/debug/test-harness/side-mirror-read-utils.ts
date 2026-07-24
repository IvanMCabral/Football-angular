import {
  FormationMatrixSummaryRow,
  FormationWidthRead,
  FormationWingbackRead,
  SideMirrorSmokeRow,
  SideMirrorSyntheticLabRow,
} from '../models/test-harness.model';
import { FormationDTO } from '../../../shared/models/lineup/formation.dto';

type FormationPosition = FormationDTO['positions'][number];
type FormationLane = 'LEFT' | 'CENTER' | 'RIGHT';

const SIDE_MIRROR_VERDICT_ORDER: Record<SideMirrorSmokeRow['verdict'], number> = {
  OK: 0,
  Parcial: 1,
  Revisar: 2,
};

export function formationPositionLane(position: FormationPosition): FormationLane {
  const role = String(position.role ?? '').toUpperCase();
  if (['LB', 'LWB', 'LM', 'LW'].includes(role)) return 'LEFT';
  if (['RB', 'RWB', 'RM', 'RW'].includes(role)) return 'RIGHT';
  const x = Number(position.xPercent);
  if (Number.isFinite(x)) {
    if (x <= 42) return 'LEFT';
    if (x >= 58) return 'RIGHT';
  }
  return 'CENTER';
}

export function formationWidthReadFromPositions(positions: FormationPosition[]): FormationWidthRead {
  const outfield = positions.filter((position) => String(position.role ?? '').toUpperCase() !== 'GK');
  let leftCount = 0;
  let centerCount = 0;
  let rightCount = 0;
  for (const position of outfield) {
    const lane = formationPositionLane(position);
    if (lane === 'LEFT') leftCount++;
    else if (lane === 'RIGHT') rightCount++;
    else centerCount++;
  }
  const wideCount = leftCount + rightCount;
  const widthScore = outfield.length > 0 ? (wideCount * 100) / outfield.length : 0;
  const sideBalance = wideCount > 0 ? 100 - (Math.abs(leftCount - rightCount) * 100 / wideCount) : 0;
  const verdict: FormationWidthRead['verdict'] = wideCount < 2
    ? 'Revisar ancho'
    : sideBalance < 45
      ? 'Revisar lado'
      : widthScore < 35
        ? 'Estrecha'
        : sideBalance < 70
          ? 'Parcial'
          : 'OK';
  const className = verdict === 'OK'
    ? 'read-strong'
    : verdict === 'Parcial' || verdict === 'Estrecha'
      ? 'read-visible'
      : 'read-check';
  return {
    verdict,
    className,
    read: `${verdict}: I${leftCount}/C${centerCount}/D${rightCount} · ancho ${Math.round(widthScore)}% · bal ${Math.round(sideBalance)}%`,
  };
}

export function formationWingbackReadFromPositions(positions: FormationPosition[]): FormationWingbackRead {
  const left = positions.find((position) => String(position.role ?? '').toUpperCase() === 'LWB');
  const right = positions.find((position) => String(position.role ?? '').toUpperCase() === 'RWB');
  if (!left && !right) {
    return {
      verdict: 'Sin carrileros',
      className: 'read-check',
      read: 'Sin LWB/RWB',
    };
  }
  if (!left || !right) {
    return {
      verdict: 'Revisar lado',
      className: 'read-check',
      read: left ? 'Solo LWB' : 'Solo RWB',
    };
  }
  const leftX = Number(left.xPercent);
  const rightX = Number(right.xPercent);
  const leftY = Number(left.yPercent);
  const rightY = Number(right.yPercent);
  const avgY = [leftY, rightY].filter(Number.isFinite).reduce((sum, value) => sum + value, 0) / 2;
  const symmetry = Number.isFinite(leftX) && Number.isFinite(rightX)
    ? 100 - Math.abs((100 - rightX) - leftX)
    : 0;
  const yGap = Number.isFinite(leftY) && Number.isFinite(rightY) ? Math.abs(leftY - rightY) : 99;
  const heightRead = Number.isFinite(avgY)
    ? avgY >= 70
      ? 'bajos'
      : avgY >= 48
        ? 'medios'
        : 'altos'
    : 'altura ?';
  const verdict: FormationWingbackRead['verdict'] = symmetry < 88 || yGap > 8
    ? 'Revisar lado'
    : Number.isFinite(avgY) && (avgY < 44 || avgY > 82)
      ? 'Revisar altura'
      : 'OK';
  const className = verdict === 'OK'
    ? 'read-strong'
    : verdict === 'Revisar altura'
      ? 'read-visible'
      : 'read-check';
  return {
    verdict,
    className,
    read: `${verdict}: ${heightRead} · sim ${Math.round(symmetry)}%`,
  };
}

export function sideMirrorRealRead(
  verdict: SideMirrorSmokeRow['verdict'],
  formation: string,
  weakLeftRightEdge: number,
  weakRightLeftEdge: number,
  width: FormationWidthRead,
  wingback: FormationWingbackRead
): string {
  if (verdict === 'OK') return 'El espejo lateral responde en ambos sentidos.';
  if (verdict === 'Parcial') return 'Un lado responde; el otro puede estar tapado por sesgo de plantel/formación.';
  const nearZero = Math.abs(weakLeftRightEdge) <= 0.012 && Math.abs(weakRightLeftEdge) <= 0.012;
  if (nearZero) {
    if (wingback.read.includes('bajos')) {
      return formation + ': caso real sin adaptación lateral; carrileros bajos/plan conservador pueden tapar la banda débil.';
    }
    if (wingback.read === 'Sin LWB/RWB') {
      return formation + ': caso real sin adaptación lateral; sin carrileros, depende de roles/jugadores de banda.';
    }
    if (width.read.includes('ancho 100%')) {
      return formation + ': caso real ancho pero plano; revisar roles/química antes de tocar motor.';
    }
    return formation + ': caso real no cambia canal ante banda débil; revisar plantel, roles y estilo.';
  }
  return 'No hay señal lateral suficiente; revisar muestra y compararla contra el control sintético.';
}

export function buildSideMirrorSmokeRowsFromMatrix(
  weakLeftRows: FormationMatrixSummaryRow[],
  weakRightRows: FormationMatrixSummaryRow[],
  positionsByFormation: Record<string, FormationPosition[]>
): SideMirrorSmokeRow[] {
  const rightByFormation = new Map(weakRightRows.map((row) => [row.formation, row]));
  return weakLeftRows
    .map((weakLeft) => {
      const weakRight = rightByFormation.get(weakLeft.formation);
      if (!weakRight) return null;
      const weakLeftWideXgL = weakLeft.avgLeftWideXgFor ?? 0;
      const weakLeftWideXgR = weakLeft.avgRightWideXgFor ?? 0;
      const weakRightWideXgL = weakRight.avgLeftWideXgFor ?? 0;
      const weakRightWideXgR = weakRight.avgRightWideXgFor ?? 0;
      const weakLeftRightEdge = roundTo(weakLeftWideXgR - weakLeftWideXgL, 3);
      const weakRightLeftEdge = roundTo(weakRightWideXgL - weakRightWideXgR, 3);
      const weakLeftOk = weakLeftRightEdge >= 0.015;
      const weakRightOk = weakRightLeftEdge >= 0.015;
      const verdict: SideMirrorSmokeRow['verdict'] = weakLeftOk && weakRightOk
        ? 'OK'
        : weakLeftOk || weakRightOk
          ? 'Parcial'
          : 'Revisar';
      const width = formationWidthReadFromPositions(positionsByFormation[weakLeft.formation] ?? []);
      const wingback = formationWingbackReadFromPositions(positionsByFormation[weakLeft.formation] ?? []);
      return {
        formation: weakLeft.formation,
        seedStart: weakLeft.seedStart,
        seedEnd: weakLeft.seedEnd,
        seedCount: weakLeft.seedCount,
        weakLeftWideXgL,
        weakLeftWideXgR,
        weakRightWideXgL,
        weakRightWideXgR,
        weakLeftWideShotsL: weakLeft.avgLeftWideShotsFor ?? 0,
        weakLeftWideShotsR: weakLeft.avgRightWideShotsFor ?? 0,
        weakRightWideShotsL: weakRight.avgLeftWideShotsFor ?? 0,
        weakRightWideShotsR: weakRight.avgRightWideShotsFor ?? 0,
        weakLeftRightEdge,
        weakRightLeftEdge,
        verdict,
        widthRead: width.read,
        widthClass: width.className,
        wingbackRead: wingback.read,
        wingbackClass: wingback.className,
        read: sideMirrorRealRead(
          verdict,
          weakLeft.formation,
          weakLeftRightEdge,
          weakRightLeftEdge,
          width,
          wingback
        ),
      };
    })
    .filter((row): row is SideMirrorSmokeRow => row !== null)
    .sort(sortSideMirrorSmokeRows);
}

export function mapSyntheticSideMirrorRows(
  rows: SideMirrorSyntheticLabRow[],
  positionsByFormation: Record<string, FormationPosition[]>
): SideMirrorSmokeRow[] {
  return rows
    .map((row) => {
      const width = formationWidthReadFromPositions(positionsByFormation[row.formation] ?? []);
      const wingback = formationWingbackReadFromPositions(positionsByFormation[row.formation] ?? []);
      return {
        formation: row.formation,
        seedStart: row.seedStart,
        seedEnd: row.seedEnd,
        seedCount: row.seedCount,
        weakLeftWideXgL: row.weakLeftWideXgL,
        weakLeftWideXgR: row.weakLeftWideXgR,
        weakRightWideXgL: row.weakRightWideXgL,
        weakRightWideXgR: row.weakRightWideXgR,
        weakLeftWideShotsL: row.weakLeftWideShotsL,
        weakLeftWideShotsR: row.weakLeftWideShotsR,
        weakRightWideShotsL: row.weakRightWideShotsL,
        weakRightWideShotsR: row.weakRightWideShotsR,
        weakLeftRightEdge: row.weakLeftRightEdge,
        weakRightLeftEdge: row.weakRightLeftEdge,
        verdict: row.verdict,
        widthRead: width.read,
        widthClass: width.className,
        wingbackRead: wingback.read,
        wingbackClass: wingback.className,
        read: row.read,
      };
    })
    .sort(sortSideMirrorSmokeRows);
}

function sortSideMirrorSmokeRows(a: SideMirrorSmokeRow, b: SideMirrorSmokeRow): number {
  return SIDE_MIRROR_VERDICT_ORDER[a.verdict] - SIDE_MIRROR_VERDICT_ORDER[b.verdict]
    || a.formation.localeCompare(b.formation);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
