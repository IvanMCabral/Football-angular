import { CanActivateFn, Routes } from '@angular/router';

export const buildDebugRoutes = (enableDebugRoutes: boolean, guarded: CanActivateFn[]): Routes => (
  enableDebugRoutes
    ? [
        {
          path: 'debug/test-harness',
          loadComponent: () => import('./features/debug/test-harness/test-harness-page.component')
            .then((m) => m.TestHarnessPageComponent),
          canActivate: guarded,
        },
      ]
    : []
);
