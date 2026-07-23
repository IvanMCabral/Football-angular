import {
  professionalQaActionLabel,
  professionalQaActionStatusClass,
  professionalQaCheckLabel,
  professionalQaChecklistTestId,
  professionalQaTextLabel,
  professionalQaVerdictClass,
  professionalQaVerdictLabel,
  professionalSmokeVerdictClass,
} from './test-harness-professional-qa-utils';

describe('test-harness-professional-qa-utils', () => {
  it('builds stable checklist test ids', () => {
    expect(professionalQaChecklistTestId('Pixel no-cliff rule')).toBe('qa-check-pixel-no-cliff-rule');
  });

  it('labels verdicts for the UI', () => {
    expect(professionalQaVerdictLabel('Pending')).toBe('Pendiente');
    expect(professionalQaVerdictLabel('Review')).toBe('Revisar');
    expect(professionalQaVerdictLabel('Fallback')).toBe('OK con avisos');
    expect(professionalQaVerdictClass('OK')).toBe('qa-verdict-ok');
    expect(professionalQaVerdictClass('Review')).toBe('qa-verdict-review');
  });

  it('labels known professional QA checks', () => {
    expect(professionalQaCheckLabel('All formations audit')).toBe('Auditoría de todas las formaciones');
    expect(professionalQaCheckLabel('unknown')).toBe('unknown');
  });

  it('translates professional QA evidence text', () => {
    const translated = professionalQaTextLabel('Not run yet. Manual x/y movement creates a measurable multi-seed signal.');
    expect(translated).toContain('Todavía no corrido');
    expect(translated).toContain('Mover x/y manualmente genera una señal multi-seed medible.');
  });

  it('labels professional smoke verdict classes', () => {
    expect(professionalSmokeVerdictClass('OK')).toBe('qa-verdict-ok');
    expect(professionalSmokeVerdictClass('Partial')).toBe('qa-verdict-fallback');
    expect(professionalSmokeVerdictClass('Fail')).toBe('qa-verdict-review');
  });

  it('labels actions and action states', () => {
    expect(professionalQaActionLabel('Pixel movement signal')).toBe('Correr smoke posición completo');
    expect(professionalQaActionLabel('not actionable')).toBe('Sin acción directa');
    expect(professionalQaActionStatusClass('running')).toBe('qa-action-status-running');
  });
});
