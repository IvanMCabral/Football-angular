/** Extracts a readable message from unknown frontend/backend errors. */
export function readableErrorMessage(error: unknown, fallback = 'Error desconocido'): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const nested = (error as { error?: { message?: unknown } }).error;
    if (nested?.message) {
      return String(nested.message);
    }
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? fallback);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' && error.trim() ? error : fallback;
}
