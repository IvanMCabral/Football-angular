export interface Team {
  /** Canonical UI identity: the backend WorldTeam.worldTeamId. */
  id: string;
  /** Not supplied by the WorldTeam catalog endpoint. */
  managerId?: string;
  name: string;
  country: string;
  budget: number;
  formation: string;
  squadSize?: number;
  createdAt?: string;
  updatedAt?: string;
  /** Canonical metadata retained from the WorldTeam wire contract. */
  realTeamId?: string | null;
  realLeagueId?: string | null;
}

/** Exact wire shape returned by GET /api/v1/world/teams. */
export interface WorldTeamResponse {
  worldTeamId: string;
  realTeamId: string | null;
  realLeagueId: string | null;
  name: string;
  country: string;
  city: string | null;
  baseBudget: number | null;
  baseFormation: string | null;
  origin: 'REAL' | 'CUSTOM' | null;
  division: string | null;
}

// SessionTeam - Equipos guardados en Redis/session (NO en base de datos)
export interface SessionTeam {
  sessionTeamId: string;
  baseTeamId: string | null;  // null si fue creado desde cero
  name: string;
  country: string;
  budget: number;
  formation: string;
  morale: number;
  reputation: number;
  origin: 'CLONED' | 'CUSTOM' | 'RANDOM';
}

export interface CreateTeamRequest {
  name: string;
  country: string;
  initialBudget: number;
}

// Request para crear equipo en session
export interface CreateSessionTeamRequest {
  name: string;
  country: string;
  budget?: number;
  formation?: string;
}

export interface RandomTeamsRequest {
  count: number;
}

export interface RandomTeamsResponse {
  count: number;
  message: string;
}

export type Formation =
  | 'FORMATION_4_4_2'
  | 'FORMATION_4_3_3'
  | 'FORMATION_4_2_3_1'
  | 'FORMATION_3_5_2'
  | 'FORMATION_5_3_2'
  | 'FORMATION_4_1_4_1'
  | 'FORMATION_3_4_3';
