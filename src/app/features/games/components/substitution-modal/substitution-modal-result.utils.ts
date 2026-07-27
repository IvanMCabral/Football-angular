import { SubstitutionResult } from '../../../../core/services/match-engine.model';

export function isAlreadyAppliedSubstitutionResult(result: SubstitutionResult): boolean {
  if (result.success) {
    return false;
  }
  const error = (result.error || '').toLowerCase();
  return error.includes('already been substituted off')
    || error.includes('already been substituted on')
    || error.includes('is on the pitch already');
}

export function formatSubstitutionError(err: unknown): string {
  const candidate = err as {
    error?: { error?: string; message?: string; detail?: string } | string;
    message?: string;
    status?: number;
  };
  if (typeof candidate.error === 'string' && candidate.error.trim()) {
    return candidate.error;
  }
  const serverError = typeof candidate.error === 'object' && candidate.error !== null
    ? candidate.error
    : null;
  const serverMessage = serverError?.error || serverError?.message || serverError?.detail;
  if (serverMessage) {
    return serverMessage;
  }
  if (candidate.status && candidate.status >= 400 && candidate.status < 500) {
    return `Sustitución rechazada por el servidor (HTTP ${candidate.status}).`;
  }
  if (candidate.message && candidate.message !== 'network') {
    return candidate.message;
  }
  return 'Error de red al intentar la sustitución';
}
