export interface Team {
  id: string;
  managerId: string;
  name: string;
  country: string;
  budget: number;
  formation: Formation;
  squadSize: number;
  createdAt: string;
  updatedAt: string;
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
