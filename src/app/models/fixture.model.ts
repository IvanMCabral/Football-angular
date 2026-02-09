export interface FixtureResponse {
  rounds: FixtureRoundDto[];
}

export interface FixtureRoundDto {
  roundNumber: number;
  matches: FixtureMatchDto[];
}

export interface FixtureMatchDto {
  home: string;
  away: string;
  isBye: boolean;
}
