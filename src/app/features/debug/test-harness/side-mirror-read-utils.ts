import {
  FormationWidthRead,
  FormationWingbackRead,
  SideMirrorSmokeRow,
} from '../models/test-harness.model';

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
