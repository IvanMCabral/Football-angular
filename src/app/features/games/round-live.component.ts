import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatchEngineService } from '../../core/services/match-engine.service';
import { CareerService } from '../../core/services/career.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { LiveMatchModalsService } from '../../core/services/live-match-modals.service';
import { Match } from '../../shared/models/match.model';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { filter, map, switchMap, tap, take, takeUntil, catchError, shareReplay } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MatchCardComponent } from '../../shared/components/match-card/match-card.component';
import { RoundLiveViewModel, RoundMatchVM } from './models/round-live.model';
import { MatchEvent, MatchState, RoundState } from '../../core/services/match-engine.model';
import {
  buildPersistedInjuryAutoModalPayload,
  buildPendingRoundStartMatches,
  buildPendingLiveModalNotice,
  canOpenCriticalLiveModal,
  areRoundMatchesFinished,
  findInjuryAutoModalCandidates,
  findRestorableInjuryAutoModals,
  findRivalRedCardModalCandidate,
  findRoundControlAnchorMatch,
  getLastRoundEvents,
  getRoundEventIcon,
  getRoundStatusText,
  getRoundTeamName,
  hasRoundMatchStarted,
  isTerminalRoundState,
  isLocalDebugHost,
  mapRoundFixtureStatus,
  normalizeTacticalSlotSnapshotForDebug,
  normalizeTerminalLiveState,
  patchRoundMatchFormation,
  parsePersistedInjuryAutoModalRefs,
  readStorageFlag,
  resolveRoundManagerTeamId,
  ROUND_LIVE_DEBUG_STORAGE_KEYS,
  shouldQueueInjuryAutoModal,
  shouldQueueRivalCardModal,
  writeStorageFlag
} from './utils/round-live-utils';
import {
  roundLiveDebugTriggerUserInjuryModals,
  roundLiveDebugTriggerUserPartidoInjury
} from './round-live-debug-actions.utils';
import {
  roundLiveEnqueueAutoModal,
  roundLiveMaybeOpenInjuryAutoModal,
  roundLiveMaybeOpenRivalCardInfoModal,
  roundLiveOpenInjuryAutoModal,
  roundLiveOpenRivalCardInfoModal,
  roundLiveQueueOrOpenAutoModal,
  roundLiveQueueOrOpenRivalCardModal
} from './round-live-modal-flow.utils';
import { InjuryAutoModalPayload, RivalCardModalPayload } from './round-live-modal-flow.models';
import { initializeRoundLiveComponent } from './round-live-bootstrap.utils';
import {
  roundLiveApplyDeFreezeIfNeeded,
  roundLiveIniciarTodos,
  roundLiveResumeAll,
  roundLiveStartRoundEngine,
  roundLiveTryAutoStartRound
} from './round-live-engine-flow.utils';

declare global {
  interface Window {
    managerDebugRoundLive?: {
      triggerUserInjuries: (playerIds?: string[]) => { queued: string[]; reason?: string };
      triggerUserPartidoInjury: (playerId?: string) => { injuredPlayerId?: string; reason?: string };
    };
  }
}

interface PersistedInjuryAutoModal {
  matchId: string;
  preSelectedPlayerId: string;
}

interface RoundFormationModalCloseResult {
  success?: boolean;
  formation?: string;
}

@Component({
  selector: 'app-round-live',
  standalone: true,
  imports: [CommonModule, RouterLink, MatchCardComponent],
  templateUrl: './round-live.component.html',
  styleUrls: ['./round-live.component.css']
})
export class RoundLiveComponent implements OnInit, OnDestroy {
  private engineService = inject(MatchEngineService);
  private careerService = inject(CareerService);
  private modals = inject(LiveMatchModalsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private logger = inject(AppLoggerService);

  private destroy$ = new Subject<void>();

  private logDevWarn(message: string, ...args: unknown[]): void {
    this.logger.warn(message, ...args);
  }

  private logDevError(message: string, ...args: unknown[]): void {
    this.logger.error(message, ...args);
  }

  private readonly autoModalShownEventIds = new Set<string>();

  private isAutoModalOpen = false;
  private queuedAutoModals: InjuryAutoModalPayload[] = [];
  private activeInjuryAutoModal: PersistedInjuryAutoModal | null = null;
  private restoredPersistedInjuryAutoModals = false;
  private releaseQueuedAutoModalResumeHold: (() => void) | null = null;

  private isCriticalLiveModalOpen = false;

  private readonly injuryAutoModalStoragePrefix = 'manager.pendingInjuryAutoModals.v1';
  readonly isLocalDebugHost = typeof window !== 'undefined'
    && isLocalDebugHost(window.location.hostname);
  readonly showDebugControls = this.readDebugControlsFlag();
  debugFreezeEnabled = this.showDebugControls && this.readDebugFreezeFlag();
  debugSuppressAutoInjuryModals = this.showDebugControls && this.readDebugSuppressAutoInjuryFlag();
  private currentUserSessionTeamId: string | null = null;
  private debugFreezePauseInFlight = false;
  private debugFreezePausedRoundKeys = new Set<string>();
  private debugRoundLiveHook?: Window['managerDebugRoundLive'];

  private readonly rivalCardShownEventIds = new Set<string>();

  private isRivalCardModalOpen = false;
  private queuedRivalCardModal: RivalCardModalPayload | null = null;

  pendingLiveModalNotice: string | null = null;

  private autoStartTriggered = false;
  /** Prevents a second start POST while the first round is being prepared. */
  startingRound = false;
  startPhase = 'Preparando fecha';

  private resolvedRoundId$ = new BehaviorSubject<string | null>(null);

  private vmSubject = new BehaviorSubject<RoundLiveViewModel>({
    gameId: '',
    roundNumber: 1,
    matches: [],
    teamNameMap: {},
    allFinished: false,
    errorMsg: '',
    isRoundPaused: false,
    byeTeam: null, // UX-6: BYE indicator
    anyStarted: false // drives "Iniciar Todos" button visibility
  });

  vm$!: Observable<RoundLiveViewModel>;

  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {
    initializeRoundLiveComponent(this);
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined' && window.managerDebugRoundLive === this.debugRoundLiveHook) {
      delete window.managerDebugRoundLive;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateVm(vm: RoundLiveViewModel) {
    this.vmSubject.next(vm);
  }

  private registerDebugRoundLiveHook(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      return;
    }
    const hook = {
      triggerUserInjuries: (playerIds?: string[]) => this.debugTriggerUserInjuryModals(playerIds),
      triggerUserPartidoInjury: (playerId?: string) => this.debugTriggerUserPartidoInjury(playerId)
    };
    this.debugRoundLiveHook = hook;
    window.managerDebugRoundLive = hook;
  }

  debugTriggerUserPartidoInjury(playerId?: string): { injuredPlayerId?: string; reason?: string } { return roundLiveDebugTriggerUserPartidoInjury(this, playerId); }

  private debugTriggerUserInjuryModals(playerIds?: string[]): { queued: string[]; reason?: string } { return roundLiveDebugTriggerUserInjuryModals(this, playerIds); }

  onDebugDoubleInjury(): void {
    const result = this.debugTriggerUserInjuryModals();
    if (result.reason) {
      this.logDevWarn('[ROUND-LIVE] double injury skipped:', result.reason);
    }
  }

  onDebugPartidoInjury(): void {
    const result = this.debugTriggerUserPartidoInjury();
    if (result.reason) {
      this.logDevWarn('[ROUND-LIVE] Partido injury skipped:', result.reason);
      this.pendingLiveModalNotice = result.reason;
      return;
    }
    this.pendingLiveModalNotice = 'Lesi?n de prueba creada. Abr? Partido para validar AUTO + cambio manual.';
  }

  private startRoundEngine(gameId: string, matches: RoundMatchVM[]): any { return roundLiveStartRoundEngine(this, gameId, matches); }

  private maybeOpenInjuryAutoModal(matches: RoundMatchVM[]): void { roundLiveMaybeOpenInjuryAutoModal(this, matches); }

  private maybeOpenRivalCardInfoModal(matches: RoundMatchVM[]): void { roundLiveMaybeOpenRivalCardInfoModal(this, matches); }

  private queueOrOpenRivalCardModal(payload: RivalCardModalPayload): void { roundLiveQueueOrOpenRivalCardModal(this, payload); }

  private openRivalCardInfoModal(payload: RivalCardModalPayload): void { roundLiveOpenRivalCardInfoModal(this, payload); }

  private queueOrOpenAutoModal(payload: InjuryAutoModalPayload): void { roundLiveQueueOrOpenAutoModal(this, payload); }

  private enqueueAutoModal(payload: InjuryAutoModalPayload): void { roundLiveEnqueueAutoModal(this, payload); }

  private openInjuryAutoModal(payload: InjuryAutoModalPayload): void { roundLiveOpenInjuryAutoModal(this, payload); }

  pauseAll() {
    const vm = this.vmSubject.value;
    const anchorMatch = this.findRoundControlAnchorMatch(vm);
    if (!anchorMatch) {
      return;
    }

    this.engineService.pauseRoundForMatch(vm.gameId, String(anchorMatch.match.id)).subscribe({
      next: () => {
        this.updateVm({ ...this.vmSubject.value, isRoundPaused: true });
        this.drainQueuedLiveModals();
      },
      error: (err) => this.logDevError('[ROUND-LIVE] pauseAll failed', err)
    });
  }

  toggleDebugFreeze(): void {
    this.debugFreezeEnabled = !this.debugFreezeEnabled;
    writeStorageFlag(this.localStorageRef(), ROUND_LIVE_DEBUG_STORAGE_KEYS.freeze, this.debugFreezeEnabled);

    if (this.debugFreezeEnabled) {
      const vm = this.vmSubject.value;
      this.debugFreezePausedRoundKeys.delete(`${vm.gameId}|${vm.roundNumber}`);
      this.applyDeFreezeIfNeeded(vm);
    }
  }

  private resolveManagerTeamId(userMatch: RoundMatchVM, state: MatchState): string {
    return resolveRoundManagerTeamId({
      userMatch,
      state,
      currentUserSessionTeamId: this.currentUserSessionTeamId
    });
  }

  toggleDebugSuppressAutoInjuryModals(): void {
    this.debugSuppressAutoInjuryModals = !this.debugSuppressAutoInjuryModals;
    writeStorageFlag(
      this.localStorageRef(),
      ROUND_LIVE_DEBUG_STORAGE_KEYS.suppressAutoInjury,
      this.debugSuppressAutoInjuryModals
    );

    if (this.debugSuppressAutoInjuryModals) {
      this.queuedAutoModals = [];
      this.updatePendingLiveModalNotice();
    }
  }

  private readDebugFreezeFlag(): boolean {
    return readStorageFlag(this.localStorageRef(), ROUND_LIVE_DEBUG_STORAGE_KEYS.freeze);
  }

  private readDebugSuppressAutoInjuryFlag(): boolean {
    return readStorageFlag(this.localStorageRef(), ROUND_LIVE_DEBUG_STORAGE_KEYS.suppressAutoInjury);
  }

  private readDebugControlsFlag(): boolean {
    return this.isLocalDebugHost &&
      readStorageFlag(this.localStorageRef(), ROUND_LIVE_DEBUG_STORAGE_KEYS.controls);
  }

  private localStorageRef(): Storage | undefined {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  }

  private applyDeFreezeIfNeeded(vm: RoundLiveViewModel, force = false): void { roundLiveApplyDeFreezeIfNeeded(this, vm, force); }

  resumeAll(): any { return roundLiveResumeAll(this); }

  private findRoundControlAnchorMatch(vm: RoundLiveViewModel): RoundMatchVM | null {
    return findRoundControlAnchorMatch(vm);
  }

  private normalizeTerminalLiveState(state: MatchState): MatchState {
    return normalizeTerminalLiveState(state);
  }

  iniciarTodos(): void { roundLiveIniciarTodos(this); }

  private tryAutoStartRound(vm: RoundLiveViewModel): void { roundLiveTryAutoStartRound(this, vm); }

  changeTactic(match: Match, team: 'HOME' | 'AWAY', tactic: 'ATTACK' | 'DEFEND' | 'BALANCED') {
    const matchId = String(match.id);
    const matches = this.vmSubject.value.matches;
    const rm = matches.find(r => String(r.match.id) === matchId);
    if (rm?.state?.status !== 'RUNNING') {
      return;
    }
    this.engineService.sendCommand(matchId, {
      type: 'CHANGE_TACTIC',
      targetTeam: team,
      tactic: tactic
    }).subscribe();
  }

  onTacticChange(match: Match, event: { team: 'HOME' | 'AWAY'; tactic: 'ATTACK' | 'DEFEND' | 'BALANCED' }) {
    this.changeTactic(match, event.team, event.tactic);
  }

  onSubstitutionOpen(match: Match, state: MatchState | undefined): void {
    if (!state || !canOpenCriticalLiveModal({ state, isCriticalLiveModalOpen: this.isCriticalLiveModalOpen })) {
      return;
    }
    this.isCriticalLiveModalOpen = true;
    this.modals.openSubstitutionModal(String(match.id), state)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        complete: () => this.releaseCriticalLiveModalGate(),
        error: (err) => {
          this.releaseCriticalLiveModalGate();
          this.logDevError('[ROUND-LIVE] openSubstitutionModal error', err);
        }
      });
  }

  onFormationOpen(match: Match, state: MatchState | undefined): void {
    if (!state || !canOpenCriticalLiveModal({ state, isCriticalLiveModalOpen: this.isCriticalLiveModalOpen })) {
      return;
    }
    this.isCriticalLiveModalOpen = true;
    this.modals.openFormationModal(String(match.id), state)
      .pipe(map(result => result as RoundFormationModalCloseResult | undefined))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: RoundFormationModalCloseResult | undefined) => {
          if (result?.success && result.formation) {
            this.patchVisibleFormation(String(match.id), state, String(result.formation));
          }
        },
        complete: () => this.releaseCriticalLiveModalGate(),
        error: (err) => {
          this.releaseCriticalLiveModalGate();
          this.logDevError('[ROUND-LIVE] openFormationModal error', err);
        }
      });
  }

  private releaseCriticalLiveModalGate(): void {
    this.isCriticalLiveModalOpen = false;
    if (this.debugFreezeEnabled) {
      setTimeout(() => this.applyDeFreezeIfNeeded(this.vmSubject.value, true), 0);
    }
    setTimeout(() => this.drainQueuedLiveModals(), 0);
  }

  private persistInjuryAutoModals(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const payload = buildPersistedInjuryAutoModalPayload({
      active: this.activeInjuryAutoModal,
      queued: this.queuedAutoModals.map(item => ({
        matchId: item.matchId,
        preSelectedPlayerId: item.preSelectedPlayerId
      }))
    });
    const key = this.injuryAutoModalStorageKey();
    if (!payload) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, JSON.stringify(payload));
  }

  private restorePersistedInjuryAutoModals(matches: RoundMatchVM[]): void {
    if (this.restoredPersistedInjuryAutoModals || typeof sessionStorage === 'undefined') {
      return;
    }
    this.restoredPersistedInjuryAutoModals = true;
    const key = this.injuryAutoModalStorageKey();
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return;
    }

    const refs = parsePersistedInjuryAutoModalRefs(raw);
    if (!refs) {
      sessionStorage.removeItem(key);
      return;
    }

    sessionStorage.removeItem(key);
    if (refs.length === 0) {
      return;
    }

    for (const item of findRestorableInjuryAutoModals({ refs, matches })) {
      this.queueOrOpenAutoModal({
        matchId: item.matchId,
        state: item.state,
        preSelectedPlayerId: item.preSelectedPlayerId
      });
    }
    this.persistInjuryAutoModals();
  }

  private injuryAutoModalStorageKey(): string {
    const vm = this.vmSubject.value;
    return `${this.injuryAutoModalStoragePrefix}:${vm.gameId}:${vm.roundNumber}`;
  }

  private drainQueuedLiveModals(): void {
    const queued = this.queuedAutoModals.shift();
    this.updatePendingLiveModalNotice();
    if (queued) {
      setTimeout(() => this.openQueuedInjuryAutoModalIfStillNeeded(queued), 0);
      return;
    }
    const queuedRival = this.queuedRivalCardModal;
    this.queuedRivalCardModal = null;
    this.updatePendingLiveModalNotice();
    if (queuedRival) {
      setTimeout(() => this.openRivalCardInfoModal(queuedRival), 0);
    }
  }

  private updatePendingLiveModalNotice(): void {
    this.pendingLiveModalNotice = buildPendingLiveModalNotice({
      queuedInjuryCount: this.queuedAutoModals.length,
      hasQueuedRivalCard: !!this.queuedRivalCardModal,
      isCriticalLiveModalOpen: this.isCriticalLiveModalOpen
    });
  }

  private openQueuedInjuryAutoModalIfStillNeeded(payload: InjuryAutoModalPayload): void {
    this.releaseQueuedAutoModalResumeHold?.();
    this.releaseQueuedAutoModalResumeHold = null;
    if (this.modals.wasPlayerConfirmedSubstitutedOff(payload.matchId, payload.preSelectedPlayerId)) {
      setTimeout(() => this.drainQueuedLiveModals(), 0);
      return;
    }
    if (this.queuedAutoModals.length > 0) {
      this.releaseQueuedAutoModalResumeHold = this.modals.holdRoundResumeAfterModalClose();
    }
    this.queueOrOpenAutoModal(payload);
  }

  private patchVisibleFormation(matchId: string, state: MatchState, formation: string): void {
    const currentVm = this.vmSubject.value;
    const patchedMatches = patchRoundMatchFormation({
      matches: currentVm.matches,
      matchId,
      state,
      formation
    });
    this.vmSubject.next({ ...currentVm, matches: patchedMatches });
  }

  onPartidoOpen(match: Match, state: MatchState | undefined): void {
    if (!state || !canOpenCriticalLiveModal({ state, isCriticalLiveModalOpen: this.isCriticalLiveModalOpen })) {
      return;
    }
    this.isCriticalLiveModalOpen = true;
    this.updatePendingLiveModalNotice();
    const currentVm = this.vmSubject.value;
    this.modals.openPartidoModal(String(match.id), state, {
      home: this.getTeamName(state.homeTeamId, currentVm.teamNameMap),
      away: this.getTeamName(state.awayTeamId, currentVm.teamNameMap)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        complete: () => this.releaseCriticalLiveModalGate(),
        error: (err) => {
          this.releaseCriticalLiveModalGate();
          this.logDevError('[ROUND-LIVE] openPartidoModal error', err);
        }
      });
  }

  getTeamName(teamId: unknown, teamNameMap: { [id: string]: string } | null): string {
    return getRoundTeamName(teamId, teamNameMap);
  }

  getStatusText(status: string): string {
    return getRoundStatusText(status);
  }

  getEventIcon(eventType: string): string {
    return getRoundEventIcon(eventType);
  }

  getLastEvents(events: MatchEvent[], count: number): MatchEvent[] {
    return getLastRoundEvents(events, count);
  }

  get userMatch(): RoundMatchVM | null {
    return this.vmSubject.value.matches.find(m => m.isUserMatch) || null;
  }

  get otherMatches(): RoundMatchVM[] {
    return this.vmSubject.value.matches.filter(m => !m.isUserMatch);
  }

  private mapFixtureStatus(fixtureStatus: string): 'SCHEDULED' | 'SIMULATED' | 'CANCELLED' {
    return mapRoundFixtureStatus(fixtureStatus);
  }

  goToRoundSummary() {
    const vm = this.vmSubject.value;
    this.router.navigate([`/games/${vm.gameId}/round/${vm.roundNumber}/summary`]);
  }
}
