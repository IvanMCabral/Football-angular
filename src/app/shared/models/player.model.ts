export interface Player {
  id: string;
  name: string;
  age: number;
  position: Position;
  overallRating: number;
  energy: number;
  injured: boolean;
  marketValue: number;
}

// SessionPlayer - Jugadores guardados en Redis/session (NO en base de datos)
export interface SessionPlayer {
  sessionPlayerId: string;
  basePlayerId: string | null;  // null si fue creado desde cero
  name: string;
  age: number;
  position: string;
  attack: number;
  defense: number;
  technique: number;
  speed: number;
  stamina: number;
  mentality: number;
  marketValue: number;
  energy: number;
  form: number;
  injured: boolean;
  injuryType: string | null;
  injuryRemainingMatches: number;
  origin: 'CLONED' | 'CUSTOM' | 'RANDOM';
  yellowCards?: number;
  redCards?: number;
  suspended?: boolean;
  suspensionRemainingMatches?: number;
}

export interface CreatePlayerRequest {
  name: string;
  age: number;
  position: Position;
  attributes: PlayerAttributes;
  marketValue: number;
}

export interface PlayerAttributes {
  attack: number;
  defense: number;
  technique: number;
  speed: number;
  stamina: number;
  mentality: number;
}

export type Position =
  | 'GK'
  | 'CB'
  | 'LB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'ST'
  | 'LW'
  | 'RW';
