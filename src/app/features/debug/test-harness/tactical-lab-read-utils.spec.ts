import {
  backFiveFamilyClass,
  backFiveFamilyRead,
  backFiveTransitionClass,
  backFiveTransitionRead,
  lowBlockLabClass,
  lowBlockLabRead,
} from './tactical-lab-read-utils';

describe('tactical-lab-read-utils', () => {
  it('reads low-block variants from risk, output and possession deltas', () => {
    expect(lowBlockLabRead('base', 0, 0, 0, 0)).toBe('Referencia');
    expect(lowBlockLabRead('high', 0.04, 0.03, 0, 0)).toBe('Más salida, más riesgo');
    expect(lowBlockLabRead('high', 0.04, 0, 0, 0)).toBe('Más salida');
    expect(lowBlockLabRead('high', 0, 0, 0, 0)).toBe('Revisar salida');
    expect(lowBlockLabRead('low', 0, -0.03, 0, 0)).toBe('Más bloque');
    expect(lowBlockLabRead('low', 0, 0.03, 0.30, -1)).toBe('Demasiado hundido');
    expect(lowBlockLabRead('low', 0, 0, 0, 0)).toBe('Bloque similar');
  });

  it('maps low-block variants to visual classes', () => {
    expect(lowBlockLabClass('base', 0, 0)).toBe('read-check');
    expect(lowBlockLabClass('low', -0.03, 0)).toBe('read-strong');
    expect(lowBlockLabClass('low', 0, 0)).toBe('read-visible');
    expect(lowBlockLabClass('high', 0.03, 0)).toBe('read-visible');
    expect(lowBlockLabClass('high', 0, 0)).toBe('read-check');
  });

  it('reads back-five transition variants from output and risk', () => {
    expect(backFiveTransitionRead('base', 0, 0, 0)).toBe('Referencia');
    expect(backFiveTransitionRead('high', 0.04, 0.03, 0)).toBe('Más transición, más riesgo');
    expect(backFiveTransitionRead('high', 0, 0, 0.30)).toBe('Más transición');
    expect(backFiveTransitionRead('high', 0, 0, 0)).toBe('Revisar salida');
    expect(backFiveTransitionRead('low', 0, -0.03, 0)).toBe('Más cobertura');
    expect(backFiveTransitionRead('low', 0, 0, 0)).toBe('Cobertura similar');
  });

  it('maps back-five transition variants to visual classes', () => {
    expect(backFiveTransitionClass('base', 0, 0, 0)).toBe('read-check');
    expect(backFiveTransitionClass('high', 0.04, 0, 0)).toBe('read-visible');
    expect(backFiveTransitionClass('high', 0, 0, 0)).toBe('read-check');
    expect(backFiveTransitionClass('low', 0, -0.03, 0)).toBe('read-strong');
    expect(backFiveTransitionClass('low', 0, 0, 0)).toBe('read-visible');
  });

  it('reads back-five family tradeoffs by tactical identity', () => {
    expect(backFiveFamilyRead('transition', 0, 0, 0, 0)).toBe('Referencia transición');
    expect(backFiveFamilyRead('low-block', -0.04, -0.04, 0, 0)).toBe('Bloque bajo: protege, resigna salida');
    expect(backFiveFamilyRead('low-block', 0, -0.04, 0, 0)).toBe('Bloque bajo más seguro');
    expect(backFiveFamilyRead('low-block', 0, 0, 0, 0)).toBe('Bloque bajo a revisar');
    expect(backFiveFamilyRead('wingback-control', 0.04, 0.03, 0, 0)).toBe('Carrileros altos: más banda, más riesgo');
    expect(backFiveFamilyRead('wingback-control', 0, 0, 0.30, 0)).toBe('Carrileros altos: más banda');
    expect(backFiveFamilyRead('wingback-control', 0, 0.13, 0, 0)).toBe('Carrileros altos: riesgo sin ventaja clara');
    expect(backFiveFamilyRead('wingback-control', 0, 0, 0, 0)).toBe('Carrileros altos neutros');
  });

  it('maps back-five family reads to visual classes', () => {
    expect(backFiveFamilyClass('transition', 0, 0, 0, 0)).toBe('read-check');
    expect(backFiveFamilyClass('low-block', 0, -0.04, 0, 0)).toBe('read-strong');
    expect(backFiveFamilyClass('low-block', 0, 0, 0, 0)).toBe('read-visible');
    expect(backFiveFamilyClass('wingback-control', 0.04, 0, 0, 0)).toBe('read-visible');
    expect(backFiveFamilyClass('wingback-control', 0, 0, 0, 0)).toBe('read-check');
  });
});
