import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  SessionTeam,
  CareerStatus,
  PalmaresEntry,
  TeamTitleCount,
  Fixture,
  Standing,
  Champion,
  AllStandingsResponse,
  PromotionResult,
  DivisionInfo
} from './career.model';

/**
 * CareerService - Service for Career Mode gameplay.
 *
 * CRITICAL ARCHITECTURE RULE:
 * - This service ONLY consumes /api/v1/career/** endpoints
 * - It reads data from CareerSave (Redis)
 * - NEVER use /api/v1/teams (WorldSnapshot)
 * - Only for gameplay, not for editor/dashboard
 */
@Injectable({
  providedIn: 'root'
})
export class CareerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/career`;

  /**
   * Get all teams in the current career session.
   * Reads from CareerSave, NOT from WorldSnapshot.
   * 
   * IMPORTANT: Backend uses JWT userId, not careerId in URL.
   * The careerId parameter is kept for consistency but not used in URL.
   * Backend resolves career automatically from authenticated user.
   * 
   * @param careerId The career ID (for component consistency, not used in request)
   * @returns Observable<SessionTeam[]> Teams cloned in the career
   */
  getCareerTeams(careerId: string): Observable<SessionTeam[]> {
    // Backend uses /api/v1/career/teams (userId from JWT)
    // careerId param kept for explicit component architecture
    return this.http.get<SessionTeam[]>(`${this.apiUrl}/teams`);
  }

  /**
   * Get a specific team by its session team ID.
   * 
   * @param sessionTeamId The session team ID (UUID from CareerSave)
   * @returns Observable<SessionTeam>
   */
  getCareerTeam(sessionTeamId: string): Observable<SessionTeam> {
    return this.http.get<SessionTeam>(`${this.apiUrl}/teams/${sessionTeamId}`);
  }

  /**
   * Get career status (current round, total rounds, etc.)
   * 
   * @returns Observable<CareerStatus>
   */
  getCareerStatus(): Observable<CareerStatus> {
    return this.http.get<CareerStatus>(`${this.apiUrl}/status`);
  }

  /**
   * Advance to the next round or finish tournament
   * Only works if careerPhase === 'WAITING_USER'
   * 
   * @param careerId The career ID
   * @returns Observable<any>
   */
  advanceToNextRound(careerId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${careerId}/next-round`, {});
  }

  /**
   * Continue to a new season (tournament)
   * Only works if careerPhase === 'FINISHED'
   * 
   * @returns Observable<any>
   */
  continueToNewSeason(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/continue`, {});
  }

  /**
   * Get the tournament hall of fame (palmares)
   * 
   * @returns Observable<PalmaresEntry[]>
   */
  getPalmares(): Observable<PalmaresEntry[]> {
    return this.http.get<PalmaresEntry[]>(`${this.apiUrl}/palmares`);
  }

  /**
   * Get teams with most titles in history (TOPs)
   * 
   * @returns Observable<TeamTitleCount[]>
   */
  getTopTeams(): Observable<TeamTitleCount[]> {
    return this.http.get<TeamTitleCount[]>(`${this.apiUrl}/tops`);
  }

  /**
   * Get fixtures (matches) for a specific round from CareerSave (Redis)
   * 
   * IMPORTANT: This endpoint reads from CareerSave, NOT from PostgreSQL.
   * Fixtures are stored in Redis as part of CareerSave.tournament.fixtures.
   * 
   * @param round The round number to get fixtures for
   * @returns Observable<Fixture[]> List of fixtures for the round
   */
  getFixturesByRound(round: number): Observable<Fixture[]> {
    return this.http.get<Fixture[]>(`${this.apiUrl}/fixtures?round=${round}`);
  }

  /**
   * Get the complete standings table from CareerSave (Redis)
   * 
   * IMPORTANT: Standings are already correctly calculated and accumulated
   * in CareerSave.tournament.standings. This endpoint returns them directly.
   * 
   * @returns Observable<Standing[]> List of team standings sorted by points
   */
   getStandings(): Observable<Standing[]> {
     return this.http.get<Standing[]>(`${this.apiUrl}/standings`);
   }

   /**
    * Get ALL standings tables for ALL divisions
    * Returns an array of divisions with their respective standings
    *
    * @returns Observable<AllStandingsResponse> Response with divisions array
    */
   getAllStandings(): Observable<AllStandingsResponse> {
     return this.http.get<AllStandingsResponse>(`${this.apiUrl}/standings/all`);
   }

  /**
   * Get the tournament champion from CareerSave (Redis)
   * 
   * IMPORTANT: Only valid when tournament is marked as finished.
   * Returns champion info with points, wins, and goal difference.
   * 
   * @returns Observable<Champion> Champion team data
   */
  getChampion(): Observable<Champion> {
    return this.http.get<Champion>(`${this.apiUrl}/champion`);
  }

  /**
   * Get promotions and relegations from the last completed season
   *
   * @returns Observable<PromotionResult[]> List of promotions/relegations
   */
  getPromotions(): Observable<PromotionResult[]> {
    return this.http.get<PromotionResult[]>(`${this.apiUrl}/promotions`);
  }

  /**
   * Get all divisions in the career
   *
   * @returns Observable<DivisionInfo[]>
   */
  getDivisions(): Observable<DivisionInfo[]> {
    return this.http.get<DivisionInfo[]>(`${this.apiUrl}/divisions`);
  }

  /**
   * Get palmares (champions) for a specific division
   *
   * @param divisionId The division ID
   * @returns Observable<PalmaresEntry[]>
   */
  getPalmaresByDivision(divisionId: string): Observable<PalmaresEntry[]> {
    return this.http.get<PalmaresEntry[]>(`${this.apiUrl}/palmares/division/${divisionId}`);
  }

  /**
   * Get TOP teams with most titles for a specific division
   *
   * @param divisionId The division ID
   * @returns Observable<TeamTitleCount[]>
   */
  getTopTeamsByDivision(divisionId: string): Observable<TeamTitleCount[]> {
    return this.http.get<TeamTitleCount[]>(`${this.apiUrl}/tops/division/${divisionId}`);
  }
}
