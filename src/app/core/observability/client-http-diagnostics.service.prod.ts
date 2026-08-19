import { Injectable, signal } from '@angular/core';

export const TEAMS_ROUTE = '/api/v1/world/teams';

@Injectable({ providedIn: 'root' })
export class ClientHttpDiagnosticsService {
  readonly snapshot = signal({ events: [], inFlight: false });

  isEnabled(): boolean { return false; }
  startRequest(): void {}
  attachNativeTransport(): void {}
  recordNative(..._args: unknown[]): void {}
  recordAngularNext(..._args: unknown[]): void {}
  recordAngularError(..._args: unknown[]): void {}
  recordTeamServiceMapped(): void {}
  recordChooseTeamNext(): void {}
  recordChooseTeamNextEnter(..._args: unknown[]): undefined { return undefined; }
  recordChooseTeamTeamsAssigned(..._args: unknown[]): void {}
  recordChooseTeamLoadingFalse(..._args: unknown[]): void {}
  recordChooseTeamInstanceDestroyed(..._args: unknown[]): void {}
  recordChooseTeamAfterRender(..._args: unknown[]): void {}
  currentRequestSeq(): undefined { return undefined; }
  finalizeRequest(): void {}
  resetForTest(): void {}
}
