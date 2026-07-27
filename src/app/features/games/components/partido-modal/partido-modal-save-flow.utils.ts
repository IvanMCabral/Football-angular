import { from, of } from 'rxjs';
import { concatMap, finalize, switchMap, takeUntil, timeout, toArray } from 'rxjs/operators';

export function savePartidoModal(ctx: any): void {
  if (ctx.isSubmitting) return;
  if (ctx.autoFilledSlots.size > 0) {
    ctx.errorMsg = 'No se puede guardar con jugadores AUTO: elegí manualmente el reemplazo para que cuente como sustitución real.';
    ctx.cdr.markForCheck();
    return;
  }
  if (!ctx.hasPendingChanges()) {
    ctx.dialogRef.close({ success: false, reason: 'no-change' });
    return;
  }

  ctx.isSubmitting = true;
  const saveToken = Symbol('partido-save');
  ctx.activeSaveToken = saveToken;
  window.setTimeout(() => {
    if (ctx.activeSaveToken === saveToken && ctx.isSubmitting) {
      ctx.isSubmitting = false;
      ctx.errorMsg = 'No hubo respuesta al guardar el cambio del partido. Probá de nuevo o reiniciá el live desde el harness.';
      ctx.cdr.markForCheck();
    }
  }, 15000);

  ctx.errorMsg = '';
  ctx.sanitizeDuplicateSlotAssignments();
  if (ctx.autoFilledSlots.size > 0) {
    ctx.isSubmitting = false;
    ctx.activeSaveToken = null;
    ctx.errorMsg = 'No se puede guardar con jugadores AUTO: elegí manualmente el reemplazo para que cuente como sustitución real.';
    ctx.cdr.markForCheck();
    return;
  }

  const slots = ctx.buildSlotListForBackend();
  ctx.rememberPlayerCoordsForSavedSlots(slots);
  if (slots.some((slot: any) => !slot.sessionPlayerId)) {
    ctx.isSubmitting = false;
    ctx.errorMsg = 'No se puede confirmar: todos los slots visibles deben tener un jugador real. Cerrá y reabrí el modal si ves sólo roles.';
    return;
  }

  const substitutionFlow$ = ctx.pendingSubstitutions.length > 0
    ? from(ctx.pendingSubstitutions).pipe(
        concatMap((sub: any) => ctx.engineService.substitutePlayer(
          ctx.data.matchId,
          sub.playerOffId,
          sub.playerOnId
        )),
        toArray()
      )
    : of([]);

  substitutionFlow$.pipe(
    switchMap((substitutionResults: any[]) => {
      const failedSubstitution = substitutionResults.find(result =>
        !result.success && !isAlreadyAppliedPartidoSubstitutionResult(result)
      );
      if (failedSubstitution) {
        return of({ formationResult: null, substitutionResults, failedSubstitution });
      }
      return ctx.engineService.changeFormation(ctx.data.matchId, slots, ctx.selectedFormation()).pipe(
        switchMap((formationResult: any) => of({
          formationResult,
          substitutionResults,
          failedSubstitution: null
        }))
      );
    }),
    timeout(15000),
    finalize(() => {
      ctx.isSubmitting = false;
      if (ctx.activeSaveToken === saveToken) ctx.activeSaveToken = null;
      ctx.cdr.markForCheck();
    }),
    takeUntil(ctx.destroy$)
  )
    .subscribe({
      next: ({ formationResult, substitutionResults, failedSubstitution }: any) => {
        if (failedSubstitution) {
          ctx.errorMsg = failedSubstitution.error || 'Cambio de jugador rechazado por el servidor';
          ctx.cdr.markForCheck();
          return;
        }
        if (formationResult?.success) {
          closeSuccessfulPartidoSave(ctx, formationResult, substitutionResults, slots);
        } else {
          ctx.errorMsg = formationResult?.error || 'Cambio de formación rechazado por el servidor';
        }
      },
      error: (err: unknown) => {
        ctx.errorMsg = describePartidoSaveError(err);
        ctx.cdr.markForCheck();
      }
    });
}

export function isAlreadyAppliedPartidoSubstitutionResult(result: { success: boolean; error?: string | null }): boolean {
  if (result.success) return false;
  const error = (result.error || '').toLowerCase();
  return error.includes('already been substituted off')
    || error.includes('already been substituted on')
    || error.includes('is on the pitch already');
}

export function describePartidoSaveError(err: unknown): string {
  const candidate = err as {
    status?: number;
    statusText?: string;
    error?: unknown;
    message?: string;
  };
  const backendError = candidate?.error;

  if (backendError && typeof backendError === 'object') {
    const shaped = backendError as { error?: string; message?: string; detail?: string; code?: string };
    const message = shaped.error ?? shaped.message ?? shaped.detail;
    if (message) return `${candidate.status ?? 'Error'} ${shaped.code ? shaped.code + ': ' : ''}${message}`;
  }
  if (typeof backendError === 'string' && backendError.trim()) {
    return `${candidate.status ?? 'Error'} ${backendError}`;
  }
  if (candidate?.message) {
    return candidate.status
      ? `${candidate.status ?? 'Error'} ${candidate.message}`
      : `Error de red al intentar aplicar cambios del partido: ${candidate.message}`;
  }
  return 'Error de red al intentar aplicar cambios del partido';
}

function closeSuccessfulPartidoSave(
  ctx: any,
  formationResult: any,
  substitutionResults: any[],
  slots: any[]
): void {
  const appliedSubstitutions = ctx.pendingSubstitutions.length;
  ctx.snackBar.open(
    appliedSubstitutions > 0
      ? `Cambios aplicados (${appliedSubstitutions}) y formación ${ctx.selectedFormation()} guardada`
      : `Formación cambiada a ${ctx.selectedFormation()}`,
    'OK',
    { duration: 3000, panelClass: 'success-toast' }
  );
  ctx.dialogRef.close({
    success: true,
    result: formationResult,
    substitutionResults,
    formation: ctx.selectedFormation(),
    savedSlots: slots,
    substitutionsApplied: appliedSubstitutions,
    substitutions: ctx.pendingSubstitutions.map((sub: any) => ({
      playerOffId: sub.playerOffId,
      playerOnId: sub.playerOnId
    }))
  });
}
